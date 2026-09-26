import os
import uuid as uuid_mod
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.product import Product, ProductImage
from app.services import product_service
from app.schemas.product import (
    CategoryCreate, CategoryResponse, BrandCreate, BrandResponse,
    ProductCreate, ProductResponse, PaginatedProducts, ProductList,
    ColorResponse, ProductImageResponse,
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
    return await product_service.get_products(db, f)


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


@router.get("/products/{slug}", response_model=ProductResponse)
async def get_product(slug: str, db: Annotated[AsyncSession, Depends(get_db)]):
    product = await product_service.get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products", status_code=status.HTTP_201_CREATED, response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await product_service.create_product(db, data)


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
    return product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = "archived"
    await db.flush()


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

    allowed = {"image/jpeg", "image/png", "image/webp", "image/avif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, AVIF images allowed")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid_mod.uuid4().hex}.{ext}"
    product_dir = os.path.join(settings.UPLOAD_DIR, "products", str(product_id))
    os.makedirs(product_dir, exist_ok=True)

    filepath = os.path.join(product_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    rel_path = f"/uploads/products/{product_id}/{filename}"

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
        sort_order=0,
        is_primary=is_primary,
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)
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

    await db.delete(image)
    await db.flush()


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_categories_tree(db)


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
    return await product_service.create_category(db, data)


@router.get("/brands", response_model=list[BrandResponse])
async def list_brands(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_brands(db)


@router.post("/brands", status_code=status.HTTP_201_CREATED, response_model=BrandResponse)
async def create_brand(
    data: BrandCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await product_service.create_brand(db, data)


@router.get("/colors", response_model=list[ColorResponse])
async def list_colors(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_colors(db)
