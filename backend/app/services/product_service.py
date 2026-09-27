from uuid import UUID
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.product import Product, Category, Brand, Collection, Color, ProductVariant, ProductImage, ProductStatus, Gender
from app.models.content import Favorite
from slugify import slugify
import uuid as uuid_mod


async def get_categories_tree(db: AsyncSession) -> list:
    result = await db.execute(
        select(Category).where(Category.parent_id == None, Category.is_active == True).order_by(Category.sort_order)
    )
    return list(result.scalars().all())


async def get_category_by_slug(db: AsyncSession, slug: str):
    result = await db.execute(select(Category).where(Category.slug == slug))
    return result.scalar_one_or_none()


async def create_category(db: AsyncSession, data) -> Category:
    cat = Category(
        name=data.name,
        name_uz=data.name_uz,
        name_ru=data.name_ru,
        name_en=data.name_en,
        slug=data.slug or slugify(data.name),
        description=data.description,
        image=data.image,
        parent_id=data.parent_id,
        sort_order=data.sort_order or 0,
        is_active=data.is_active if data.is_active is not None else True,
    )
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


async def get_products(db: AsyncSession, filters, user_id: UUID | None = None) -> dict:
    query = select(Product).where(Product.status == ProductStatus.ACTIVE)

    if hasattr(filters, 'category_id') and filters.category_id:
        query = query.where(Product.category_id == filters.category_id)
    if hasattr(filters, 'brand_id') and filters.brand_id:
        query = query.where(Product.brand_id == filters.brand_id)
    if hasattr(filters, 'collection_id') and filters.collection_id:
        query = query.where(Product.collection_id == filters.collection_id)
    if hasattr(filters, 'gender') and filters.gender:
        # BOTH products appear in both boys and girls
        query = query.where(
            or_(Product.gender == filters.gender, Product.gender == Gender.BOTH)
        )
    if hasattr(filters, 'min_price') and filters.min_price is not None:
        query = query.where(Product.selling_price >= filters.min_price)
    if hasattr(filters, 'max_price') and filters.max_price is not None:
        query = query.where(Product.selling_price <= filters.max_price)
    if hasattr(filters, 'is_on_sale') and filters.is_on_sale:
        query = query.where(Product.discount_percent > 0)
    if hasattr(filters, 'is_featured') and filters.is_featured:
        query = query.where(Product.is_featured == True)
    if hasattr(filters, 'is_new') and filters.is_new:
        query = query.where(Product.is_new == True)
    if hasattr(filters, 'is_bestseller') and filters.is_bestseller:
        query = query.where(Product.is_bestseller == True)
    if hasattr(filters, 'search') and filters.search:
        search_term = f"%{filters.search}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    sort_by = getattr(filters, 'sort_by', 'newest') or 'newest'
    if sort_by == 'price_asc':
        query = query.order_by(Product.selling_price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.selling_price.desc())
    elif sort_by == 'popular':
        query = query.order_by(Product.is_bestseller.desc(), Product.created_at.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    page = getattr(filters, 'page', 1) or 1
    page_size = getattr(filters, 'page_size', 20) or 20
    query = query.offset((page - 1) * page_size).limit(page_size)

    query = query.options(
        selectinload(Product.brand),
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(ProductVariant.color),
    )

    result = await db.execute(query)
    products = list(result.scalars().unique().all())

    import math
    pages = math.ceil(total / page_size) if total > 0 else 1

    return {"items": products, "total": total, "page": page, "pages": pages}


async def get_product_by_slug(db: AsyncSession, slug: str):
    query = select(Product).where(Product.slug == slug).options(
        selectinload(Product.brand),
        selectinload(Product.category),
        selectinload(Product.collection),
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(ProductVariant.color),
        selectinload(Product.variants).selectinload(ProductVariant.color),
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_product(db: AsyncSession, data) -> Product:
    slug = data.slug or slugify(data.name)
    existing = await db.execute(select(Product).where(Product.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid_mod.uuid4().hex[:6]}"

    sku = data.sku or f"VK-{uuid_mod.uuid4().hex[:8].upper()}"

    product = Product(
        name=data.name, name_uz=data.name_uz, name_ru=data.name_ru, name_en=data.name_en,
        slug=slug, sku=sku, barcode=data.barcode,
        description=data.description, description_uz=data.description_uz,
        description_ru=data.description_ru, description_en=data.description_en,
        short_description=data.short_description,
        brand_id=data.brand_id, category_id=data.category_id, collection_id=data.collection_id,
        gender=data.gender, age_min=data.age_min, age_max=data.age_max,
        max_weight_kg=data.max_weight_kg, product_weight_kg=data.product_weight_kg,
        dimensions=data.dimensions, wheel_type=data.wheel_type, wheel_count=data.wheel_count,
        max_speed_kmh=data.max_speed_kmh, battery_type=data.battery_type,
        has_remote_control=data.has_remote_control, has_lights=data.has_lights, has_music=data.has_music,
        purchase_price=data.purchase_price, selling_price=data.selling_price,
        discount_percent=data.discount_percent or 0,
        discount_price=data.discount_price,
        seo_title=data.seo_title, seo_description=data.seo_description,
        status=data.status or ProductStatus.DRAFT,
        is_featured=data.is_featured or False,
        is_bestseller=data.is_bestseller or False,
        is_new=data.is_new if data.is_new is not None else True,
    )
    db.add(product)
    await db.flush()

    if hasattr(data, 'variants') and data.variants:
        for v in data.variants:
            variant = ProductVariant(
                product_id=product.id,
                color_id=v.color_id,
                sku=v.sku or f"{sku}-{uuid_mod.uuid4().hex[:4].upper()}",
                barcode=v.barcode,
                additional_price=v.additional_price or 0,
                stock=10,
            )
            db.add(variant)

    await db.flush()

    result = await db.execute(
        select(Product).where(Product.id == product.id).options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.collection),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.color),
        )
    )
    return result.scalar_one()


async def update_product(db: AsyncSession, product_id: UUID, data) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field not in ('variants', 'images'):
            setattr(product, field, value)

    if 'variants' in update_data and update_data['variants']:
        existing = await db.execute(
            select(ProductVariant).where(ProductVariant.product_id == product_id)
        )
        for old_v in existing.scalars().all():
            await db.delete(old_v)
        await db.flush()

        for v in data.variants:
            variant = ProductVariant(
                product_id=product_id,
                color_id=v.color_id,
                sku=v.sku or f"{product.sku}-{uuid_mod.uuid4().hex[:4].upper()}",
                barcode=v.barcode,
                additional_price=v.additional_price or 0,
                stock=10,
            )
            db.add(variant)

    await db.flush()

    result2 = await db.execute(
        select(Product).where(Product.id == product_id).options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.collection),
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.color),
        )
    )
    return result2.scalar_one()


async def get_brands(db: AsyncSession) -> list:
    result = await db.execute(select(Brand).where(Brand.is_active == True).order_by(Brand.name))
    return list(result.scalars().all())


async def create_brand(db: AsyncSession, data) -> Brand:
    brand = Brand(name=data.name, slug=data.slug or slugify(data.name), logo=data.logo, description=data.description)
    db.add(brand)
    await db.flush()
    await db.refresh(brand)
    return brand


async def get_colors(db: AsyncSession) -> list:
    result = await db.execute(select(Color).where(Color.is_active == True).order_by(Color.name))
    return list(result.scalars().all())


async def create_color(db: AsyncSession, data) -> Color:
    color = Color(
        name=data.name,
        name_uz=getattr(data, "name_uz", None),
        name_ru=getattr(data, "name_ru", None),
        name_en=getattr(data, "name_en", None),
        hex_code=data.hex_code,
        is_active=data.is_active if hasattr(data, "is_active") else True,
    )
    db.add(color)
    await db.flush()
    await db.refresh(color)
    return color


async def search_products(db: AsyncSession, query_str: str, limit: int = 10) -> list:
    search_term = f"%{query_str}%"
    query = select(Product).where(
        Product.status == ProductStatus.ACTIVE,
        or_(
            Product.name.ilike(search_term),
            Product.sku.ilike(search_term),
            Product.barcode.ilike(search_term),
        )
    ).options(
        selectinload(Product.brand),
        selectinload(Product.images),
    ).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().unique().all())
