from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.product import Product
from app.services import product_service
from app.schemas.product import (
    CategoryCreate, CategoryResponse, BrandCreate, BrandResponse,
    ProductCreate, ProductResponse, PaginatedProducts, ProductList,
    SizeResponse, ColorResponse,
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


@router.get("/sizes", response_model=list[SizeResponse])
async def list_sizes(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_sizes(db)


@router.get("/colors", response_model=list[ColorResponse])
async def list_colors(db: Annotated[AsyncSession, Depends(get_db)]):
    return await product_service.get_colors(db)
