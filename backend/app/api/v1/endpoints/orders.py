from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.services import order_service
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, PaginatedOrders

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return await order_service.create_order(db, data, current_user.id)


@router.get("", response_model=PaginatedOrders)
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    order_status: str | None = None,
    payment_status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    class Filters:
        pass
    f = Filters()
    f.status = order_status
    f.payment_status = payment_status
    f.search = search
    f.page = page
    f.page_size = page_size
    return await order_service.get_orders(db, f, current_user.id, current_user.role)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    data: OrderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
):
    if not data.status:
        raise HTTPException(status_code=400, detail="Status is required")
    return await order_service.update_order_status(db, order_id, data.status, current_user.id)


@router.patch("/{order_id}/confirm-payment", response_model=OrderResponse)
async def confirm_payment(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
):
    from sqlalchemy import select
    from datetime import datetime, timezone
    from app.models.order import Order, Payment, PaymentStatus, TransactionStatus
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.payments))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Payment already confirmed")

    order.payment_status = PaymentStatus.PAID
    order.paid_at = datetime.now(timezone.utc)

    for payment in order.payments:
        if payment.status != TransactionStatus.COMPLETED:
            payment.status = TransactionStatus.COMPLETED

    await db.flush()
    await db.refresh(order)

    from app.services.telegram_service import send_telegram_message
    import asyncio
    asyncio.create_task(send_telegram_message(
        f"✅ <b>Оплата подтверждена</b>\n\n"
        f"Заказ: <b>#{order.order_number}</b>\n"
        f"Сумма: <b>{order.total:,.0f} сум</b>\n"
        f"Подтвердил: {current_user.first_name} {current_user.last_name}"
    ))

    return order


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == UserRole.CUSTOMER:
        if order.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if order.status.value != "new":
            raise HTTPException(status_code=400, detail="Can only cancel NEW orders")
    return await order_service.update_order_status(db, order_id, "cancelled", current_user.id)
