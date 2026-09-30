"""Coupon validation and discount calculation (server side is the source of truth)."""
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import DiscountType, Promotion, PromotionAppliesTo


@dataclass
class PricedLine:
    product_id: object
    category_id: object
    total: Decimal


def _money(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


async def get_valid_promotion(db: AsyncSession, code: str, *, lock: bool = False) -> Promotion:
    code = (code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Promokod kiritilmagan")
    query = select(Promotion).where(
        func.lower(Promotion.code) == code.lower(),
        Promotion.is_active == True,  # noqa: E712
    )
    if lock:
        query = query.with_for_update()
    promo = (await db.execute(query)).scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promokod noto'g'ri")

    now = datetime.now(timezone.utc)
    start = promo.start_date if promo.start_date.tzinfo else promo.start_date.replace(tzinfo=timezone.utc)
    end = promo.end_date if promo.end_date.tzinfo else promo.end_date.replace(tzinfo=timezone.utc)
    if now < start:
        raise HTTPException(status_code=400, detail="Promokod hali faol emas")
    if now > end:
        raise HTTPException(status_code=400, detail="Promokod muddati tugagan")
    if promo.usage_limit is not None and promo.used_count >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Promokoddan foydalanish limiti tugagan")
    return promo


def calculate_discount(promo: Promotion, lines: list[PricedLine]) -> Decimal:
    """Discount amount for the given priced lines (never more than their total)."""
    if promo.applies_to == PromotionAppliesTo.PRODUCT:
        base = sum((l.total for l in lines if l.product_id == promo.product_id), Decimal(0))
    elif promo.applies_to == PromotionAppliesTo.CATEGORY:
        base = sum((l.total for l in lines if l.category_id == promo.category_id), Decimal(0))
    else:
        base = sum((l.total for l in lines), Decimal(0))

    order_total = sum((l.total for l in lines), Decimal(0))
    if promo.min_order_amount is not None and order_total < Decimal(promo.min_order_amount):
        raise HTTPException(
            status_code=400,
            detail=f"Promokod {Decimal(promo.min_order_amount):,.0f} so'mdan yuqori buyurtmalar uchun",
        )
    if base <= 0:
        raise HTTPException(status_code=400, detail="Promokod savatdagi mahsulotlarga tegishli emas")

    value = Decimal(promo.discount_value)
    if promo.discount_type == DiscountType.PERCENTAGE:
        discount = base * value / Decimal(100)
    else:
        discount = value
    if promo.max_discount_amount is not None:
        discount = min(discount, Decimal(promo.max_discount_amount))
    return _money(max(Decimal(0), min(discount, base)))
