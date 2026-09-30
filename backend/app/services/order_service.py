import logging
import uuid
import math
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.order import Order, OrderItem, Payment, OrderStatus, PaymentMethod, PaymentStatus, TransactionStatus
from app.models.product import ProductVariant
from app.models.inventory import StockMovementType
from app.models.user import User, UserRole
from app.services import inventory_service
logger = logging.getLogger(__name__)


async def create_order(db: AsyncSession, data, customer_id: uuid.UUID) -> Order:
    """Create an order with inventory reservation. Uses transactions."""
    order_number = f"VK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    subtotal = Decimal(0)
    order_items = []

    # Validate and prepare items
    for item_data in data.items:
        variant_result = await db.execute(
            select(ProductVariant).where(ProductVariant.id == item_data.product_variant_id)
            .options(
                selectinload(ProductVariant.product),
                selectinload(ProductVariant.color),
            )
        )
        variant = variant_result.scalar_one_or_none()
        if not variant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product variant {item_data.product_variant_id} not found")

        # Check stock availability
        if variant.stock < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {variant.product.name} ({variant.color.name}). Available: {variant.stock}"
            )

        product = variant.product
        unit_price = float(product.selling_price) + float(variant.additional_price)
        if product.discount_price:
            unit_price = float(product.discount_price) + float(variant.additional_price)

        item_total = Decimal(str(unit_price)) * item_data.quantity
        subtotal += item_total

        order_items.append({
            "variant": variant,
            "product_name": product.name,
            "product_sku": variant.sku,
            "size_name": None,
            "color_name": variant.color.name,
            "quantity": item_data.quantity,
            "unit_price": Decimal(str(unit_price)),
            "total": item_total,
        })

    # Create order
    payment_method_map = {
        "payme": PaymentMethod.PAYME, "click": PaymentMethod.CLICK, "cash": PaymentMethod.CASH,
        "card_transfer": PaymentMethod.CARD_TRANSFER, "bank_transfer": PaymentMethod.BANK_TRANSFER,
    }
    pm = payment_method_map.get(data.payment_method.lower(), PaymentMethod.CASH)

    order = Order(
        order_number=order_number,
        customer_id=customer_id,
        status=OrderStatus.NEW,
        subtotal=subtotal,
        discount_amount=0,
        delivery_fee=0,
        total=subtotal,
        payment_method=pm,
        payment_status=PaymentStatus.PENDING,
        delivery_method=data.delivery_method,
        delivery_city=data.delivery_city,
        delivery_address=data.delivery_address,
        customer_first_name=data.customer_first_name,
        customer_last_name=data.customer_last_name,
        customer_phone=data.customer_phone,
        comment=data.comment,
    )
    db.add(order)
    await db.flush()

    # Create order items (stock is NOT decreased here — only when payment is confirmed)
    for item in order_items:
        oi = OrderItem(
            order_id=order.id,
            product_variant_id=item["variant"].id,
            product_name=item["product_name"],
            product_sku=item["product_sku"],
            size_name=item["size_name"],
            color_name=item["color_name"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            discount_amount=0,
            total=item["total"],
        )
        db.add(oi)

    # Create payment record
    payment = Payment(
        order_id=order.id,
        provider=pm,
        amount=subtotal,
        status=TransactionStatus.PENDING,
    )
    db.add(payment)

    await db.flush()
    await db.refresh(order)

    return order


async def get_orders(db: AsyncSession, filters, user_id: uuid.UUID | None = None, role: str | None = None) -> dict:
    query = select(Order).options(
        selectinload(Order.items),
    )

    # Role-based filtering: customers only see their own orders
    if role == UserRole.CUSTOMER.value or role == UserRole.CUSTOMER:
        query = query.where(Order.customer_id == user_id)

    if hasattr(filters, 'status') and filters.status:
        query = query.where(Order.status == filters.status)
    if hasattr(filters, 'payment_status') and filters.payment_status:
        query = query.where(Order.payment_status == filters.payment_status)
    if hasattr(filters, 'search') and filters.search:
        query = query.where(Order.order_number.ilike(f"%{filters.search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Order.created_at.desc())
    page = getattr(filters, 'page', 1) or 1
    page_size = getattr(filters, 'page_size', 20) or 20
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().unique().all())

    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / page_size) if total > 0 else 1}


async def get_order(db: AsyncSession, order_id: uuid.UUID) -> Order | None:
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    )
    return result.scalar_one_or_none()


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, new_status: str, user_id: uuid.UUID) -> Order:
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc)
    order.status = OrderStatus(new_status)

    if new_status == OrderStatus.CONFIRMED.value:
        order.confirmed_at = now
    elif new_status == OrderStatus.SHIPPED.value:
        order.shipped_at = now
    elif new_status == OrderStatus.DELIVERED.value:
        order.delivered_at = now
        order.payment_status = PaymentStatus.PAID
    elif new_status == OrderStatus.CANCELLED.value:
        order.cancelled_at = now
        for item in order.items:
            await inventory_service.add_stock(
                db, item.product_variant_id, item.quantity,
                f"Order {order.order_number} cancelled — stock returned", user_id,
            )

    await db.flush()
    await db.refresh(order)
    return order
