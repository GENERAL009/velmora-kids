import hashlib
import os
import uuid as uuid_mod
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user, get_db, get_optional_user, RoleChecker
from app.core.cache import cache_get, cache_set, cache_delete, cache_delete_pattern
from app.core.config import settings
from app.utils.uploads import IMAGE_TYPES, save_upload
from app.utils.audit import log_audit
from app.models.user import User, UserRole
from app.models.product import Product, ProductImage, ProductStatus
from app.services import product_service
from app.schemas.product import (
    ProductPublicResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    BrandCreate, BrandUpdate, BrandResponse,
    ProductCreate, ProductResponse, PaginatedProducts, ProductList,
    ColorCreate, ColorResponse, ProductImageResponse,
)

router = APIRouter(tags=["Products"])


@router.get("/products", response_model=PaginatedProducts)
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: UUID | None = None,
    brand_id: UUID | None = None,
    collection_id: UUID | None = None,
    gender: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    is_on_sale: bool | None = None,
    is_featured: bool | None = None,
    is_new: bool | None = None,
    is_bestseller: bool | None = None,
    search: str | None = None,
    sort_by: str | None = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filter_key = hashlib.md5(
        f"{category_id}:{brand_id}:{collection_id}:{gender}:{min_price}:{max_price}"
        f":{is_on_sale}:{is_featured}:{is_new}:{is_bestseller}:{search}:{sort_by}"
        f":{page}:{page_size}".encode()
    ).hexdigest()
    cache_key = f"products:{filter_key}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    class Filters:
        pass
    f = Filters()
    f.category_id = category_id
    f.brand_id = brand_id
    f.collection_id = collection_id
    f.gender = gender
    f.min_price = min_price
    f.max_price = max_price
    f.is_on_sale = is_on_sale
    f.is_featured = is_featured
    f.is_new = is_new
    f.is_bestseller = is_bestseller
    f.search = search
    f.sort_by = sort_by
    f.page = page
    f.page_size = page_size
    result = await product_service.get_products(db, f)
    serialized = PaginatedProducts.model_validate(result).model_dump(mode="json")
    await cache_set(cache_key, serialized, ttl=120)
    return serialized


@router.get("/products/search", response_model=list[ProductList])
async def search_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query(..., min_length=1),
):
    return await product_service.search_products(db, q)


@router.get("/products/most-viewed", response_model=list[ProductList])
async def most_viewed_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(10, ge=1, le=50),
):
    result = await db.execute(
        select(Product)
        .where(Product.status == "active")
        .order_by(Product.views.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/products/{slug}/view", status_code=204)
async def track_product_view(slug: str, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        update(Product).where(Product.slug == slug).values(views=Product.views + 1)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")


@router.get("/products/{slug}", response_model=ProductResponse | ProductPublicResponse)
async def get_product(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    viewer: Annotated[User | None, Depends(get_optional_user)] = None,
):
    product = await product_service.get_product_by_slug(db, slug)
    is_staff = viewer is not None and viewer.role in (UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)
    if not product or (not is_staff and product.status != ProductStatus.ACTIVE):
        raise HTTPException(status_code=404, detail="Product not found")
    if is_staff:
        return ProductResponse.model_validate(product)
    return ProductPublicResponse.model_validate(product)


@router.post("/products", status_code=status.HTTP_201_CREATED, response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await product_service.create_product(db, data, current_user.id)
    await cache_delete_pattern("products:*")
    return result


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    product = await product_service.update_product(db, product_id, data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await cache_delete_pattern("products:*")
    return product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.product import ProductVariant
    from app.models.order import OrderItem
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    has_orders = (await db.execute(
        select(OrderItem).where(
            OrderItem.product_variant_id.in_(
                select(ProductVariant.id).where(ProductVariant.product_id == product_id)
            )
        ).limit(1)
    )).scalar_one_or_none()
    if has_orders:
        raise HTTPException(
            status_code=400,
            detail="Mahsulot buyurtmalarda ishlatilgan, o'chirib bo'lmaydi"
        )
    try:
        await log_audit(db, current_user.id, "product_deleted", "product", str(product.id),
                        old_value={"name": product.name, "sku": product.sku})
        await db.delete(product)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Mahsulotni o'chirib bo'lmadi")
    await cache_delete_pattern("products:*")


@router.post("/products/{product_id}/images", response_model=ProductImageResponse)
async def upload_product_image(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    file: UploadFile = File(...),
    is_primary: bool = False,
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    _, rel_path = await save_upload(file, f"products/{product_id}", IMAGE_TYPES, max_mb=10)

    # New images go to the end of the gallery; the very first one becomes the main image
    count, max_order = (await db.execute(
        select(func.count(ProductImage.id), func.max(ProductImage.sort_order))
        .where(ProductImage.product_id == product_id)
    )).one()
    if not count:
        is_primary = True

    if is_primary:
        from sqlalchemy import update as sql_update
        await db.execute(
            sql_update(ProductImage)
            .where(ProductImage.product_id == product_id)
            .values(is_primary=False)
        )

    image = ProductImage(
        product_id=product_id,
        file_path=rel_path,
        alt_text=product.name,
        sort_order=(max_order + 1) if count else 0,
        is_primary=is_primary,
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)
    await cache_delete_pattern("products:*")
    return image


@router.delete("/products/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(
    product_id: UUID,
    image_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    full_path = image.file_path.lstrip("/")
    if os.path.exists(full_path):
        os.remove(full_path)

    was_primary = image.is_primary
    await db.delete(image)
    await db.flush()
    if was_primary:
        # keep a main image: promote the next one in order
        nxt = (await db.execute(
            select(ProductImage).where(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order, ProductImage.id).limit(1)
        )).scalar_one_or_none()
        if nxt:
            nxt.is_primary = True
            await db.flush()
    await cache_delete_pattern("products:*")


@router.post("/products/{product_id}/images/{image_id}/set-primary", response_model=ProductImageResponse)
async def set_primary_image(
    product_id: UUID,
    image_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    await db.execute(
        update(ProductImage)
        .where(ProductImage.product_id == product_id)
        .values(is_primary=False)
    )
    image.is_primary = True
    # the main image is always first in the gallery order
    others = (await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.id != image_id)
        .order_by(ProductImage.sort_order, ProductImage.id)
    )).scalars().all()
    image.sort_order = 0
    for i, other in enumerate(others, start=1):
        other.sort_order = i
    await db.flush()
    await db.refresh(image)
    await cache_delete_pattern("products:*")
    return image


class ImageOrder(BaseModel):
    image_ids: list[UUID] = Field(..., min_length=1, max_length=50)


@router.put("/products/{product_id}/images/order", response_model=list[ProductImageResponse])
async def reorder_product_images(
    product_id: UUID,
    body: ImageOrder,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """Save gallery order (left to right). The first image becomes the main one."""
    images = (await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )).scalars().all()
    by_id = {img.id: img for img in images}
    if len(set(body.image_ids)) != len(body.image_ids) or set(body.image_ids) != set(by_id):
        raise HTTPException(status_code=400, detail="Rasmlar ro'yxati mahsulot rasmlariga mos emas")
    for i, image_id in enumerate(body.image_ids):
        by_id[image_id].sort_order = i
        by_id[image_id].is_primary = i == 0
    await db.flush()
    await cache_delete_pattern("products:*")
    return [by_id[i] for i in body.image_ids]


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: Annotated[AsyncSession, Depends(get_db)]):
    cached = await cache_get("categories:tree")
    if cached:
        return cached
    cats = await product_service.get_categories_tree(db)
    serialized = [CategoryResponse.model_validate(c).model_dump(mode="json") for c in cats]
    await cache_set("categories:tree", serialized, ttl=300)
    return serialized


@router.get("/categories/{slug}", response_model=CategoryResponse)
async def get_category(slug: str, db: Annotated[AsyncSession, Depends(get_db)]):
    category = await product_service.get_category_by_slug(db, slug)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/categories", status_code=status.HTTP_201_CREATED, response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await product_service.create_category(db, data)
    await cache_delete("categories:tree")
    return result


@router.post("/categories/upload-image")
async def upload_category_image(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    file: UploadFile = File(...),
):
    _, url = await save_upload(file, "categories", IMAGE_TYPES, max_mb=10)
    return {"url": url}


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.product import Category
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(cat, key, value)
    await db.flush()
    await db.refresh(cat)
    await cache_delete("categories:tree")
    return cat


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.product import Category
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    product_count = (await db.execute(
        select(Product).where(Product.category_id == category_id).limit(1)
    )).scalar_one_or_none()
    if product_count:
        raise HTTPException(status_code=400, detail="Kategoriyada mahsulotlar bor, avval ularni boshqa kategoriyaga o'tkazing")
    child_count = (await db.execute(
        select(Category).where(Category.parent_id == category_id).limit(1)
    )).scalar_one_or_none()
    if child_count:
        raise HTTPException(status_code=400, detail="Kategoriyada sub-kategoriyalar bor, avval ularni o'chiring")
    try:
        await db.delete(cat)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Kategoriyani o'chirib bo'lmadi, bog'langan ma'lumotlar mavjud")
    await cache_delete("categories:tree")
    return {"message": "Category deleted"}


@router.get("/brands", response_model=list[BrandResponse])
async def list_brands(db: Annotated[AsyncSession, Depends(get_db)]):
    cached = await cache_get("brands:all")
    if cached:
        return cached
    brands = await product_service.get_brands(db)
    serialized = [BrandResponse.model_validate(b).model_dump(mode="json") for b in brands]
    await cache_set("brands:all", serialized, ttl=300)
    return serialized


@router.post("/brands", status_code=status.HTTP_201_CREATED, response_model=BrandResponse)
async def create_brand(
    data: BrandCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await product_service.create_brand(db, data)
    await cache_delete("brands:all")
    return result


@router.put("/brands/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: UUID,
    data: BrandUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.product import Brand
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(brand, key, value)
    await db.flush()
    await db.refresh(brand)
    await cache_delete("brands:all")
    return brand


@router.delete("/brands/{brand_id}")
async def delete_brand(
    brand_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.product import Brand
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    product_count = (await db.execute(
        select(Product).where(Product.brand_id == brand_id).limit(1)
    )).scalar_one_or_none()
    if product_count:
        raise HTTPException(status_code=400, detail="Brendda mahsulotlar bor, avval ularni boshqa brendga o'tkazing")
    try:
        await db.delete(brand)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Brendni o'chirib bo'lmadi, bog'langan ma'lumotlar mavjud")
    await cache_delete("brands:all")
    return {"message": "Brand deleted"}


@router.get("/colors", response_model=list[ColorResponse])
async def list_colors(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_colors(db)


@router.post("/colors", status_code=status.HTTP_201_CREATED, response_model=ColorResponse)
async def create_color(
    data: ColorCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await product_service.create_color(db, data)
