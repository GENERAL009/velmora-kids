"""Admin analytics.

All periods are calendar days in the shop's timezone (Asia/Tashkent):
`days=1` means "today since local midnight", `days=7` means today + 6 previous days.
Revenue = paid orders that were not cancelled/returned, dated by payment time.
"""
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db, RoleChecker
from app.models.order import Order, OrderItem, OrderStatus, Payment, PaymentStatus
from app.models.product import Product, ProductStatus, ProductVariant
from app.models.user import User, UserRole

router = APIRouter(prefix="/reports", tags=["Reports"])

SHOP_TZ = ZoneInfo("Asia/Tashkent")
_ADMINS = RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)
_EXCLUDED = (OrderStatus.CANCELLED, OrderStatus.RETURNED)


def _period(days: int) -> tuple[datetime, date, date]:
    """(since_utc, first_local_day, last_local_day)"""
    today = datetime.now(SHOP_TZ).date()
    first = today - timedelta(days=days - 1)
    since = datetime.combine(first, time.min, tzinfo=SHOP_TZ).astimezone(timezone.utc)
    return since, first, today


def _paid_at():
    # POS/legacy rows may lack paid_at — fall back to creation time
    return func.coalesce(Order.paid_at, Order.created_at)


def _revenue_filter(since: datetime):
    return (
        Order.payment_status == PaymentStatus.PAID,
        Order.status.notin_(_EXCLUDED),
        _paid_at() >= since,
    )


@router.get("/dashboard")
async def dashboard_kpis(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_ADMINS),
    days: int = Query(30, ge=1, le=366),
):
    since, _, _ = _period(days)

    rev_row = (await db.execute(
        select(
            func.coalesce(func.sum(Order.total), 0),
            func.count(Order.id),
        ).where(*_revenue_filter(since))
    )).one()
    revenue, paid_orders = float(rev_row[0] or 0), int(rev_row[1] or 0)

    # Cost of goods for the same paid orders (current purchase price of the product)
    cost = (await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity * Product.purchase_price), 0))
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .join(ProductVariant, ProductVariant.id == OrderItem.product_variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(*_revenue_filter(since))
    )).scalar() or 0
    delivery = (await db.execute(
        select(func.coalesce(func.sum(Order.delivery_fee), 0)).where(*_revenue_filter(since))
    )).scalar() or 0

    total_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= since)
    )).scalar() or 0
    cancelled_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= since, Order.status.in_(_EXCLUDED))
    )).scalar() or 0

    pending_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.status == OrderStatus.NEW)
    )).scalar() or 0
    awaiting_payment = (await db.execute(
        select(func.count(Order.id)).where(
            Order.payment_status == PaymentStatus.PENDING, Order.status.notin_(_EXCLUDED),
        )
    )).scalar() or 0

    sellable = (
        ProductVariant.is_active == True,  # noqa: E712
        Product.status == ProductStatus.ACTIVE,
    )
    low_stock = (await db.execute(
        select(func.count(ProductVariant.id)).join(Product, Product.id == ProductVariant.product_id)
        .where(*sellable, ProductVariant.stock > 0, ProductVariant.stock <= 5)
    )).scalar() or 0
    out_of_stock = (await db.execute(
        select(func.count(ProductVariant.id)).join(Product, Product.id == ProductVariant.product_id)
        .where(*sellable, ProductVariant.stock <= 0)
    )).scalar() or 0
    total_products = (await db.execute(
        select(func.count(Product.id)).where(Product.status == ProductStatus.ACTIVE)
    )).scalar() or 0

    goods_revenue = revenue - float(delivery)
    return {
        "revenue": revenue,
        "orders": total_orders,
        "paid_orders": paid_orders,
        "cancelled_orders": cancelled_orders,
        "average_order_value": round(revenue / paid_orders, 2) if paid_orders else 0,
        "gross_profit": round(goods_revenue - float(cost), 2),
        "pending_orders": pending_orders,
        "awaiting_payment": awaiting_payment,
        "low_stock": low_stock,
        "out_of_stock": out_of_stock,
        "total_products": total_products,
        "period_days": days,
    }


@router.get("/revenue")
async def revenue_by_period(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_ADMINS),
    days: int = Query(30, ge=1, le=366),
):
    """One point per local day in the period — days without sales are 0, so charts have no gaps."""
    since, first, last = _period(days)
    rows = (await db.execute(
        select(_paid_at(), Order.total).where(*_revenue_filter(since))
    )).all()

    buckets: dict[date, list[float]] = {}
    for paid_at, total in rows:
        if paid_at.tzinfo is None:  # SQLite returns naive UTC datetimes
            paid_at = paid_at.replace(tzinfo=timezone.utc)
        d = paid_at.astimezone(SHOP_TZ).date()
        b = buckets.setdefault(d, [0.0, 0])
        b[0] += float(total or 0)
        b[1] += 1

    out = []
    d = first
    while d <= last:
        revenue, orders = buckets.get(d, [0.0, 0])
        out.append({"date": d.isoformat(), "revenue": round(revenue, 2), "orders": int(orders)})
        d += timedelta(days=1)
    return out


@router.get("/orders-by-status")
async def orders_by_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_ADMINS),
    days: int = Query(30, ge=1, le=366),
):
    since, _, _ = _period(days)
    rows = (await db.execute(
        select(Order.status, func.count(Order.id))
        .where(Order.created_at >= since)
        .group_by(Order.status)
    )).all()
    counts = {s.value if hasattr(s, "value") else str(s): int(c) for s, c in rows}
    return [{"status": s.value, "count": counts.get(s.value, 0)} for s in OrderStatus]


@router.get("/top-products")
async def top_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_ADMINS),
    limit: int = Query(10, ge=1, le=50),
    days: int | None = Query(None, ge=1, le=366),
):
    query = (
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.total).label("total_revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.payment_status == PaymentStatus.PAID, Order.status.notin_(_EXCLUDED))
    )
    if days:
        since, _, _ = _period(days)
        query = query.where(_paid_at() >= since)
    result = await db.execute(
        query.group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc(), func.sum(OrderItem.total).desc())
        .limit(limit)
    )
    return [
        {"product": r.product_name, "sold": int(r.total_sold or 0), "revenue": float(r.total_revenue or 0)}
        for r in result.all()
    ]


@router.get("/payments")
async def payment_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_ADMINS),
    days: int | None = Query(None, ge=1, le=366),
):
    query = select(
        Payment.provider,
        Payment.status,
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("total"),
    )
    if days:
        since, _, _ = _period(days)
        query = query.where(Payment.created_at >= since)
    result = await db.execute(query.group_by(Payment.provider, Payment.status))
    return [
        {
            "provider": r.provider.value if hasattr(r.provider, "value") else str(r.provider),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "count": int(r.count),
            "total": float(r.total),
        }
        for r in result.all()
    ]

