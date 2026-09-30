import logging
import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.inventory import StockLog, StockMovementType
from app.models.product import Product, ProductVariant

logger = logging.getLogger(__name__)


async def get_stock_list(db: AsyncSession, filters) -> dict:
    query = (
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.product),
            selectinload(ProductVariant.color),
        )
        .join(Product, ProductVariant.product_id == Product.id)
    )

    search = getattr(filters, "search", None)
    if search:
        term = f"%{search}%"
        query = query.where(
            Product.name.ilike(term) | ProductVariant.sku.ilike(term)
        )

    low_stock = getattr(filters, "low_stock", None)
    if low_stock:
        query = query.where(ProductVariant.stock > 0, ProductVariant.stock <= 5)

    out_of_stock = getattr(filters, "out_of_stock", None)
    if out_of_stock:
        query = query.where(ProductVariant.stock == 0)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    page = getattr(filters, "page", 1) or 1
    page_size = getattr(filters, "page_size", 20) or 20
    query = query.order_by(Product.name, ProductVariant.sku)
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().unique().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total > 0 else 1,
    }


async def _invalidate_product_cache() -> None:
    from app.core.cache import cache_delete_pattern
    await cache_delete_pattern("products:*")


async def add_stock(
    db: AsyncSession,
    variant_id: uuid.UUID,
    quantity: int,
    note: str | None,
    user_id: uuid.UUID,
    movement_type: StockMovementType = StockMovementType.INCOMING,
    reference_id: uuid.UUID | None = None,
) -> ProductVariant:
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Miqdor musbat bo'lishi kerak")
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id).with_for_update()
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    before = variant.stock
    variant.stock += quantity

    log = StockLog(
        product_variant_id=variant_id,
        movement_type=movement_type,
        quantity=quantity,
        stock_before=before,
        stock_after=variant.stock,
        reference_id=reference_id,
        note=note,
        created_by=user_id,
    )
    db.add(log)
    await db.flush()
    await db.refresh(variant)
    await _invalidate_product_cache()
    return variant


async def adjust_stock(db: AsyncSession, variant_id: uuid.UUID, new_quantity: int, note: str | None, user_id: uuid.UUID) -> ProductVariant:
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id).with_for_update()
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    before = variant.stock
    diff = new_quantity - before
    variant.stock = new_quantity

    log = StockLog(
        product_variant_id=variant_id,
        movement_type=StockMovementType.ADJUSTMENT,
        quantity=diff,
        stock_before=before,
        stock_after=new_quantity,
        note=note or f"Tuzatish: {before} → {new_quantity}",
        created_by=user_id,
    )
    db.add(log)
    await db.flush()
    await db.refresh(variant)
    await _invalidate_product_cache()
    return variant


async def decrease_stock_for_sale(
    db: AsyncSession,
    variant_id: uuid.UUID,
    quantity: int,
    user_id: uuid.UUID,
    movement_type: StockMovementType = StockMovementType.SALE,
    reference_id: uuid.UUID | None = None,
) -> None:
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id).with_for_update()
    )
    variant = result.scalar_one_or_none()
    if not variant:
        return

    before = variant.stock
    variant.stock = max(0, variant.stock - quantity)

    log = StockLog(
        product_variant_id=variant_id,
        movement_type=movement_type,
        quantity=-quantity,
        stock_before=before,
        stock_after=variant.stock,
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(log)
    await db.flush()
    await _invalidate_product_cache()


async def get_stock_logs(db: AsyncSession, variant_id: uuid.UUID) -> list:
    result = await db.execute(
        select(StockLog)
        .where(StockLog.product_variant_id == variant_id)
        .order_by(StockLog.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def get_low_stock(db: AsyncSession, threshold: int = 5) -> list:
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.stock > 0, ProductVariant.stock <= threshold, ProductVariant.is_active == True)
        .options(
            selectinload(ProductVariant.product),
            selectinload(ProductVariant.color),
        )
    )
    return list(result.scalars().unique().all())


async def get_out_of_stock(db: AsyncSession) -> list:
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.stock == 0, ProductVariant.is_active == True)
        .options(
            selectinload(ProductVariant.product),
            selectinload(ProductVariant.color),
        )
    )
    return list(result.scalars().unique().all())
