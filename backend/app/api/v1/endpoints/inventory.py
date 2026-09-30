import uuid
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.product import Product, ProductVariant
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus
from app.models.inventory import StockLog, StockMovementType
from app.services import inventory_service
from app.schemas.inventory import (
    StockListResponse, StockItemVariant, StockAddRequest, StockAdjustRequest,
    StockLogResponse, POSSaleRequest, POSSaleResponse,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=StockListResponse)
async def list_stock(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
    search: str | None = None,
    low_stock: bool | None = None,
    out_of_stock: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    class Filters:
        pass
    f = Filters()
    f.search = search
    f.low_stock = low_stock
    f.out_of_stock = out_of_stock
    f.page = page
    f.page_size = page_size
    return await inventory_service.get_stock_list(db, f)


@router.post("/add-stock", response_model=StockItemVariant)
async def add_stock(
    data: StockAddRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    variant = await inventory_service.add_stock(
        db, data.variant_id, data.quantity, data.note, current_user.id
    )
    await db.refresh(variant, ["product", "color"])
    return variant


@router.post("/adjust-stock", response_model=StockItemVariant)
async def adjust_stock(
    data: StockAdjustRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    variant = await inventory_service.adjust_stock(
        db, data.variant_id, data.new_quantity, data.note, current_user.id
    )
    await db.refresh(variant, ["product", "color"])
    return variant


@router.get("/low-stock", response_model=list[StockItemVariant])
async def low_stock_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
    threshold: int = 5,
):
    return await inventory_service.get_low_stock(db, threshold)


@router.get("/logs/{variant_id}", response_model=list[StockLogResponse])
async def get_stock_logs(
    variant_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await inventory_service.get_stock_logs(db, variant_id)


@router.post("/pos-sale", response_model=POSSaleResponse)
async def pos_sale(
    data: POSSaleRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
):
    """POS cash register sale — creates order and decrements stock."""
    order_number = f"POS-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    total = 0.0
    order_items = []

    for item in data.items:
        result = await db.execute(
            select(ProductVariant)
            .where(ProductVariant.id == item.variant_id)
            .options(
                selectinload(ProductVariant.product), 
                selectinload(ProductVariant.color),
                selectinload(ProductVariant.size)
            )
            .with_for_update()
        )
        variant = result.scalar_one_or_none()
        if not variant:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} not found")

        if variant.stock < item.quantity:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"{variant.product.name} ({variant.color.name}): mavjud {variant.stock}, so'ralgan {item.quantity}"
            )

        price = float(variant.product.selling_price) + float(variant.additional_price)
        item_total = price * item.quantity
        total += item_total

        order_items.append({
            "variant": variant,
            "quantity": item.quantity,
            "unit_price": price,
            "total": item_total,
        })

    order = Order(
        order_number=order_number,
        customer_id=current_user.id,
        customer_first_name=data.customer_name or "Xaridor",
        customer_last_name="(Kassa)",
        customer_phone=data.customer_phone or "",
        status=OrderStatus.DELIVERED,
        payment_status=PaymentStatus.PAID,
        payment_method=PaymentMethod(data.payment_method) if data.payment_method in [e.value for e in PaymentMethod] else PaymentMethod.CASH,
        subtotal=total,
        discount_amount=0,
        delivery_fee=0,
        total=total,
        comment=data.note,
        paid_at=datetime.now(timezone.utc),
        delivered_at=datetime.now(timezone.utc),
    )
    db.add(order)
    await db.flush()

    for oi in order_items:
        v = oi["variant"]
        db_item = OrderItem(
            order_id=order.id,
            product_variant_id=v.id,
            product_name=v.product.name,
            product_sku=v.product.sku,
            size_name=v.size.name if v.size else "",
            color_name=v.color.name if v.color else "",
            quantity=oi["quantity"],
            unit_price=oi["unit_price"],
            discount_amount=0,
            total=oi["total"],
        )
        db.add(db_item)

        await inventory_service.decrease_stock_for_sale(
            db, v.id, oi["quantity"], current_user.id,
            StockMovementType.POS_SALE, order.id,
        )

    await db.flush()

    return POSSaleResponse(
        order_id=order.id,
        order_number=order_number,
        total=total,
        items_count=len(order_items),
    )
