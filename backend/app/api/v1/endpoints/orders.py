from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.services import order_service, payment_flow
from app.services.telegram_service import notify_new_order
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, PaginatedOrders

router = APIRouter(prefix="/orders", tags=["Orders"])

_PAYMENT_ADMINS = RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    background: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    order = await order_service.create_order(db, data, current_user.id)
    await db.commit()

    background.add_task(
        notify_new_order,
        order_number=order.order_number,
        customer_name=f"{order.customer_first_name} {order.customer_last_name}",
        customer_phone=order.customer_phone,
        address=", ".join(x for x in (order.delivery_city, order.delivery_address) if x),
        items=[
            {"name": i.product_name, "color": i.color_name, "quantity": i.quantity, "total": f"{i.total:,.0f}"}
            for i in order.items
        ],
        subtotal=f"{order.subtotal:,.0f}",
        discount=f"{order.discount_amount:,.0f}",
        delivery_fee=f"{order.delivery_fee:,.0f}",
        total=f"{order.total:,.0f}",
        payment_method=order.payment_method.value,
        comment=order.comment,
        has_location=order.delivery_lat is not None,
    )
    return order


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
    current_user: User = Depends(_PAYMENT_ADMINS),
):
    if not data.status:
        raise HTTPException(status_code=400, detail="Status is required")
    return await order_service.update_order_status(db, order_id, data.status, current_user)


async def _load_for_payment_change(db: AsyncSession, order_id: UUID):
    order = await payment_flow.lock_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    return order


@router.patch("/{order_id}/confirm-payment", response_model=OrderResponse)
async def confirm_payment(
    order_id: UUID,
    background: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_PAYMENT_ADMINS),
):
    order = await _load_for_payment_change(db, order_id)
    admin_name = f"{current_user.first_name} {current_user.last_name}"
    changed = await payment_flow.apply_paid(
        db, order, by_user_id=current_user.id, by_name=admin_name, source="panel",
    )
    if not changed:
        raise HTTPException(status_code=400, detail="To'lov allaqachon tasdiqlangan")
    payload = await payment_flow.build_delivery_payload(db, order, admin_name)
    message_ids = payment_flow.admin_message_ids(order)
    await db.commit()
    background.add_task(payment_flow.after_approved, payload, message_ids)
    return await order_service.get_order(db, order_id)


@router.patch("/{order_id}/suspicious-payment", response_model=OrderResponse)
async def suspicious_payment(
    order_id: UUID,
    background: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_PAYMENT_ADMINS),
):
    order = await _load_for_payment_change(db, order_id)
    admin_name = f"{current_user.first_name} {current_user.last_name}"
    changed = await payment_flow.apply_suspicious(
        db, order, by_user_id=current_user.id, by_name=admin_name, source="panel",
    )
    if not changed:
        raise HTTPException(status_code=400, detail="To'lov holatini o'zgartirib bo'lmaydi")
    message_ids = payment_flow.admin_message_ids(order)
    payment_id = next((str(p.id) for p in order.payments if p.telegram_message_id), None)
    order_number, amount = order.order_number, f"{order.total:,.0f}"
    await db.commit()
    background.add_task(payment_flow.after_suspicious, order_number, amount, admin_name, message_ids, payment_id)
    return await order_service.get_order(db, order_id)


@router.patch("/{order_id}/reject-payment", response_model=OrderResponse)
async def reject_payment(
    order_id: UUID,
    background: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(_PAYMENT_ADMINS),
    reason: str | None = Body(None, embed=True),
):
    order = await _load_for_payment_change(db, order_id)
    admin_name = f"{current_user.first_name} {current_user.last_name}"
    changed = await payment_flow.apply_rejected(
        db, order, reason=reason, by_user_id=current_user.id, by_name=admin_name, source="panel",
    )
    if not changed:
        raise HTTPException(status_code=400, detail="To'lov allaqachon tasdiqlangan")
    message_ids = payment_flow.admin_message_ids(order)
    order_number = order.order_number
    customer_name = f"{order.customer_first_name} {order.customer_last_name}"
    amount = f"{order.total:,.0f}"
    await db.commit()
    background.add_task(
        payment_flow.after_rejected, order_number, customer_name, amount, reason, admin_name, message_ids,
    )
    return await order_service.get_order(db, order_id)


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
            raise HTTPException(status_code=400, detail="Faqat yangi buyurtmani bekor qilish mumkin")
        if order.payment_status.value == "paid":
            raise HTTPException(
                status_code=400,
                detail="To'langan buyurtmani bekor qilish uchun operator bilan bog'laning",
            )
    return await order_service.update_order_status(db, order_id, "cancelled", current_user)
