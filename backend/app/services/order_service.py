import logging
import uuid
import math
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.order import (
    Order, OrderItem, Payment, OrderStatus, PaymentMethod, PaymentProvider, PaymentStatus, TransactionStatus,
)
from app.models.product import Product, ProductStatus, ProductVariant
from app.models.user import User, UserRole
from app.core.config import settings
from app.services import promotion_service
from app.services.promotion_service import PricedLine
logger = logging.getLogger(__name__)


def effective_unit_price(product: Product, variant: ProductVariant) -> Decimal:
    """Price the customer pays for one unit (same rule as the storefront)."""
    selling = Decimal(product.selling_price or 0)
    discount = Decimal(product.discount_price) if product.discount_price is not None else None
    base = discount if discount is not None and Decimal(0) < discount < selling else selling
    return base + Decimal(variant.additional_price or 0)


def delivery_fee_for(method: str | None) -> Decimal:
    return Decimal(settings.DELIVERY_FEE_COURIER) if (method or "courier") == "courier" else Decimal(0)


async def create_order(db: AsyncSession, data, customer_id: uuid.UUID) -> Order:
    """Create an order. Prices, delivery fee and coupon discount are computed here, not by the client."""
    order_number = f"VK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    if not data.items:
        raise HTTPException(status_code=400, detail="Savat bo'sh")

    # Merge duplicate lines of the same variant
    quantities: dict[uuid.UUID, int] = {}
    for item_data in data.items:
        quantities[item_data.product_variant_id] = quantities.get(item_data.product_variant_id, 0) + item_data.quantity

    subtotal = Decimal(0)
    order_items = []
    priced_lines: list[PricedLine] = []
    for variant_id, quantity in quantities.items():
        variant_result = await db.execute(
            select(ProductVariant).where(ProductVariant.id == variant_id)
            .options(
                selectinload(ProductVariant.product),
                selectinload(ProductVariant.color),
            )
        )
        variant = variant_result.scalar_one_or_none()
        if not variant or not variant.is_active or variant.product.status != ProductStatus.ACTIVE:
            raise HTTPException(status_code=404, detail="Mahsulot topilmadi yoki sotuvda emas")
        if variant.stock < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"{variant.product.name} ({variant.color.name}): omborda {variant.stock} dona qolgan",
            )
        product = variant.product
        unit_price = effective_unit_price(product, variant)
        item_total = unit_price * quantity
        subtotal += item_total
        priced_lines.append(PricedLine(product.id, product.category_id, item_total))
        order_items.append({
            "variant": variant,
            "product_name": product.name,
            "product_sku": variant.sku,
            "color_name": variant.color.name,
            "quantity": quantity,
            "unit_price": unit_price,
            "total": item_total,
        })

    discount_amount = Decimal(0)
    promo_code = (getattr(data, "promo_code", None) or "").strip()
    if promo_code:
        promo = await promotion_service.get_valid_promotion(db, promo_code, lock=True)
        discount_amount = promotion_service.calculate_discount(promo, priced_lines)
        promo.used_count = (promo.used_count or 0) + 1

    delivery_method = data.delivery_method or "courier"
    if delivery_method not in ("courier", "pickup"):
        raise HTTPException(status_code=400, detail="Noto'g'ri yetkazish usuli")
    delivery_fee = delivery_fee_for(delivery_method)
    total = subtotal - discount_amount + delivery_fee

    payment_method_map = {
        "cash": PaymentMethod.CASH,
        "card_transfer": PaymentMethod.CARD_TRANSFER,
    }
    pm = payment_method_map.get((data.payment_method or "").lower())
    if pm is None:
        raise HTTPException(status_code=400, detail="Bu to'lov usuli hozircha mavjud emas")

    lat, lon = data.delivery_lat, data.delivery_lon
    if (lat is None) != (lon is None):
        lat = lon = None

    order = Order(
        order_number=order_number,
        customer_id=customer_id,
        status=OrderStatus.NEW,
        subtotal=subtotal,
        discount_amount=discount_amount,
        delivery_fee=delivery_fee,
        total=total,
        payment_method=pm,
        payment_status=PaymentStatus.PENDING,
        delivery_method=delivery_method,
        delivery_city=data.delivery_city,
        delivery_address=data.delivery_address,
        delivery_lat=Decimal(str(round(lat, 8))) if lat is not None else None,
        delivery_lon=Decimal(str(round(lon, 8))) if lon is not None else None,
        customer_first_name=data.customer_first_name,
        customer_last_name=data.customer_last_name,
        customer_phone=data.customer_phone,
        comment=data.comment,
        notes=f"Promokod: {promo_code}" if promo_code else None,
    )
    db.add(order)
    await db.flush()

    # Stock is NOT decreased here — only when payment is confirmed (see payment_flow.apply_paid)
    for item in order_items:
        db.add(OrderItem(
            order_id=order.id,
            product_variant_id=item["variant"].id,
            product_name=item["product_name"],
            product_sku=item["product_sku"],
            size_name=None,
            color_name=item["color_name"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            discount_amount=0,
            total=item["total"],
        ))

    db.add(Payment(
        order_id=order.id,
        provider=PaymentProvider(pm.value),
        amount=total,
        status=TransactionStatus.PENDING,
    ))
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


_TERMINAL = {OrderStatus.CANCELLED, OrderStatus.RETURNED}


def _transition_allowed(current: OrderStatus, target: OrderStatus) -> bool:
    if current in _TERMINAL:
        return False  # prevents e.g. returning stock twice
    if current == OrderStatus.DELIVERED:
        return target == OrderStatus.RETURNED
    if target == OrderStatus.RETURNED:
        return current == OrderStatus.SHIPPED
    return True


async def update_order_status(db: AsyncSession, order_id: uuid.UUID, new_status: str, user: User) -> Order:
    from app.services import payment_flow
    from app.utils.audit import log_audit

    try:
        target = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri status: {new_status}")

    order = await payment_flow.lock_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current = order.status
    if target == current:
        return await get_order(db, order_id)
    if not _transition_allowed(current, target):
        raise HTTPException(
            status_code=400,
            detail=f"'{current.value}' holatidan '{target.value}' holatiga o'tkazib bo'lmaydi",
        )

    now = datetime.now(timezone.utc)
    order.status = target
    if target == OrderStatus.CONFIRMED:
        order.confirmed_at = now
    elif target == OrderStatus.SHIPPED:
        order.shipped_at = now
    elif target == OrderStatus.DELIVERED:
        order.delivered_at = now
        if order.payment_status != PaymentStatus.PAID:
            # Cash on delivery: money received now — take stock and record the payment
            await payment_flow.apply_paid(
                db, order, by_user_id=user.id, by_name=f"{user.first_name} {user.last_name}",
                source="delivered", notify_customer=False,
            )
    elif target in (OrderStatus.CANCELLED, OrderStatus.RETURNED):
        if target == OrderStatus.CANCELLED:
            order.cancelled_at = now
        # Stock is only taken when an order is paid, so only then is there anything to return
        if order.payment_status == PaymentStatus.PAID:
            reason = "bekor qilindi" if target == OrderStatus.CANCELLED else "qaytarildi"
            await payment_flow.return_stock_for_order(db, order, user.id, reason)
        elif order.payment_status == PaymentStatus.PENDING:
            order.payment_status = PaymentStatus.CANCELLED
            for p in order.payments:
                if p.status in (TransactionStatus.PENDING, TransactionStatus.SUSPICIOUS):
                    p.status = TransactionStatus.CANCELLED

    await log_audit(
        db, user.id, "order_status_changed", "order", str(order.id),
        old_value={"status": current.value}, new_value={"status": target.value},
    )
    await db.flush()
    return await get_order(db, order_id)
