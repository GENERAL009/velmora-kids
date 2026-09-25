from typing import Annotated
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus, PaymentStatus, PaymentMethod
from app.models.product import Product
from app.models.inventory import Inventory

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard")
async def dashboard_kpis(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.payment_status == PaymentStatus.PAID, Order.created_at >= since
        )
    )).scalar()

    total_orders = (await db.execute(
        select(func.count()).where(Order.created_at >= since)
    )).scalar() or 0

    avg_order = float(total_revenue) / total_orders if total_orders > 0 else 0

    pending_orders = (await db.execute(
        select(func.count()).where(Order.status == OrderStatus.NEW)
    )).scalar() or 0

    low_stock = (await db.execute(
        select(func.count()).where(Inventory.quantity > 0, Inventory.quantity <= 5)
    )).scalar() or 0

    out_of_stock = (await db.execute(
        select(func.count()).where(Inventory.quantity == 0)
    )).scalar() or 0

    total_products = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0

    return {
        "revenue": float(total_revenue),
        "orders": total_orders,
        "average_order_value": round(avg_order, 2),
        "pending_orders": pending_orders,
        "low_stock": low_stock,
        "out_of_stock": out_of_stock,
        "total_products": total_products,
        "period_days": days,
    }


@router.get("/revenue")
async def revenue_by_period(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.sum(Order.total).label("revenue"),
            func.count(Order.id).label("orders"),
        ).where(
            Order.payment_status == PaymentStatus.PAID, Order.created_at >= since
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
    )
    return [{"date": str(r.date), "revenue": float(r.revenue), "orders": r.orders} for r in result.all()]


@router.get("/top-products")
async def top_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    limit: int = Query(10, ge=1, le=50),
):
    from app.models.order import OrderItem
    result = await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.total).label("total_revenue"),
        ).group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )
    return [{"product": r.product_name, "sold": r.total_sold, "revenue": float(r.total_revenue)} for r in result.all()]


@router.get("/payments")
async def payment_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    from app.models.order import Payment, TransactionStatus
    result = await db.execute(
        select(
            Payment.provider,
            Payment.status,
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("total"),
        ).group_by(Payment.provider, Payment.status)
    )
    return [{"provider": r.provider.value if hasattr(r.provider, 'value') else str(r.provider), "status": r.status.value if hasattr(r.status, 'value') else str(r.status), "count": r.count, "total": float(r.total)} for r in result.all()]
