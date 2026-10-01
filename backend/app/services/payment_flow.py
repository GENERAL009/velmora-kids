"""Single place for payment status transitions.

Both the admin panel and the Telegram bot go through these functions, so stock,
customer stats, notifications and audit logs are always handled the same way.
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.content import Notification
from app.models.crm import CRMStatus, CustomerProfile
from app.models.inventory import StockMovementType
from app.models.order import Order, PaymentStatus, TransactionStatus
from app.models.product import ProductImage, ProductVariant
from app.services import inventory_service
from app.services import telegram_service as tg
from app.utils.audit import log_audit

logger = logging.getLogger(__name__)


async def lock_order(db: AsyncSession, order_id: uuid.UUID) -> Order | None:
    """Load an order with a row lock so concurrent approvals can't double-process it."""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.payments))
        .with_for_update(of=Order)
    )
    return result.scalar_one_or_none()


def _i18n_notification(order: Order, code: str, **params: str) -> Notification:
    """Customer notification rendered in the viewer's language by the storefront.

    title = "i18n:<code>", message = JSON params. The frontend has the templates
    (t.profile.notificationTemplates) and falls back to plain text for old rows.
    """
    return Notification(
        user_id=order.customer_id,
        title=f"i18n:{code}",
        message=json.dumps({"order": order.order_number, **params}, ensure_ascii=False),
        type="order",
        link=f"/account/orders/{order.id}",
    )


async def _update_customer_stats(db: AsyncSession, order: Order) -> None:
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == order.customer_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = CustomerProfile(user_id=order.customer_id, total_spent=0, order_count=0, average_order=0)
        db.add(profile)
    profile.order_count = (profile.order_count or 0) + 1
    profile.total_spent = Decimal(profile.total_spent or 0) + Decimal(order.total)
    profile.average_order = (profile.total_spent / profile.order_count).quantize(Decimal("0.01"))
    profile.crm_status = CRMStatus.REPEAT_CUSTOMER if profile.order_count > 1 else CRMStatus.PURCHASED


async def apply_paid(
    db: AsyncSession,
    order: Order,
    *,
    by_user_id: uuid.UUID | None,
    by_name: str,
    source: str,
    notify_customer: bool = True,
) -> bool:
    """Mark order as paid, take stock, update stats. Returns False if already paid.

    `order` must be loaded with items and payments (use `lock_order`).
    """
    if order.payment_status == PaymentStatus.PAID:
        return False

    now = datetime.now(timezone.utc)
    order.payment_status = PaymentStatus.PAID
    order.paid_at = now
    for payment in order.payments:
        if payment.status != TransactionStatus.COMPLETED:
            payment.status = TransactionStatus.COMPLETED
            payment.verified_at = now
            payment.verified_by = by_user_id
            payment.rejection_reason = None

    for item in order.items:
        await inventory_service.decrease_stock_for_sale(
            db, item.product_variant_id, item.quantity,
            by_user_id or order.customer_id,
            StockMovementType.SALE, order.id,
        )

    await _update_customer_stats(db, order)

    if notify_customer:
        db.add(_i18n_notification(order, "payment_confirmed", amount=f"{order.total:,.0f}"))

    await log_audit(
        db, by_user_id, "payment_confirmed", "order", str(order.id),
        new_value={"source": source, "by": by_name, "total": str(order.total)},
    )
    return True


async def apply_rejected(
    db: AsyncSession,
    order: Order,
    *,
    reason: str | None,
    by_user_id: uuid.UUID | None,
    by_name: str,
    source: str,
) -> bool:
    if order.payment_status == PaymentStatus.PAID:
        return False
    now = datetime.now(timezone.utc)
    order.payment_status = PaymentStatus.FAILED
    for payment in order.payments:
        if payment.status != TransactionStatus.COMPLETED:
            payment.status = TransactionStatus.FAILED
            payment.rejection_reason = reason
            payment.verified_at = now
            payment.verified_by = by_user_id
    db.add(_i18n_notification(order, "payment_rejected", reason=reason or ""))
    await log_audit(
        db, by_user_id, "payment_rejected", "order", str(order.id),
        new_value={"source": source, "by": by_name, "reason": reason},
    )
    return True


async def apply_suspicious(
    db: AsyncSession,
    order: Order,
    *,
    by_user_id: uuid.UUID | None,
    by_name: str,
    source: str,
) -> bool:
    if order.payment_status == PaymentStatus.PAID:
        return False
    changed = False
    for payment in order.payments:
        if payment.status == TransactionStatus.PENDING:
            payment.status = TransactionStatus.SUSPICIOUS
            payment.verified_at = datetime.now(timezone.utc)
            changed = True
    if not changed:
        return False
    db.add(_i18n_notification(order, "payment_review"))
    await log_audit(
        db, by_user_id, "payment_suspicious", "order", str(order.id),
        new_value={"source": source, "by": by_name},
    )
    return True


async def build_delivery_payload(db: AsyncSession, order: Order, approved_by: str) -> dict:
    """Collect everything the delivery-channel message needs (call before commit/close)."""
    items_text = ""
    for item in order.items:
        color = f" ({tg.esc(item.color_name)})" if item.color_name else ""
        items_text += f"  • {tg.esc(item.product_name)}{color} × {item.quantity}\n"

    base_url = settings.BACKEND_BASE_URL.rstrip("/") if settings.BACKEND_BASE_URL else ""
    image_urls: list[str] = []
    variant_ids = [i.product_variant_id for i in order.items if i.product_variant_id]
    if variant_ids:
        rows = await db.execute(
            select(ProductVariant.product_id).where(ProductVariant.id.in_(variant_ids))
        )
        product_ids = list(dict.fromkeys(r[0] for r in rows.all()))
        if product_ids:
            imgs = await db.execute(
                select(ProductImage).where(
                    ProductImage.product_id.in_(product_ids),
                    ProductImage.is_primary == True,  # noqa: E712
                )
            )
            for img in imgs.scalars().all():
                url = img.file_path or ""
                if url.startswith("/") and base_url:
                    url = base_url + url
                if url.startswith("http"):
                    image_urls.append(url)

    address = ", ".join(x for x in (order.delivery_city, order.delivery_address) if x)
    return {
        "order_number": order.order_number,
        "customer_name": f"{order.customer_first_name} {order.customer_last_name}",
        "customer_phone": order.customer_phone,
        "amount": f"{order.total:,.0f}",
        "address": address,
        "items_text": items_text,
        "approved_by": approved_by,
        "product_image_urls": image_urls,
        "latitude": order.delivery_lat,
        "longitude": order.delivery_lon,
        "payment_label": tg.PAYMENT_METHOD_LABELS.get(order.payment_method.value, order.payment_method.value),
    }


def admin_message_ids(order: Order) -> list[int]:
    return [p.telegram_message_id for p in order.payments if p.telegram_message_id]


async def edit_admin_messages(message_ids: list[int], text: str) -> None:
    """Update the verification-button messages in every admin chat."""
    for mid in message_ids:
        for aid in settings.TELEGRAM_ADMIN_IDS:
            await tg._send_request("editMessageText", {
                "chat_id": str(aid),
                "message_id": mid,
                "text": text,
                "parse_mode": "HTML",
            })


async def after_approved(payload: dict, message_ids: list[int]) -> None:
    """Post-commit side effects of an approval (run as a background task)."""
    try:
        await edit_admin_messages(
            message_ids,
            f"✅ <b>TO'LOV TASDIQLANDI</b>\n\n"
            f"🛒 Buyurtma: <b>#{tg.esc(payload['order_number'])}</b>\n"
            f"💰 Summa: <b>{payload['amount']} so'm</b>\n"
            f"👨‍💼 Tasdiqlagan: {tg.esc(payload['approved_by'])}\n"
            f"🕐 {datetime.now(timezone.utc).strftime('%d.%m.%Y %H:%M')} (UTC)",
        )
        await tg.notify_payment_approved(**payload)
    except Exception:  # noqa: BLE001
        logger.exception("after_approved failed for %s", payload.get("order_number"))


async def after_rejected(order_number: str, customer_name: str, amount: str, reason: str | None,
                         by_name: str, message_ids: list[int]) -> None:
    try:
        await edit_admin_messages(
            message_ids,
            f"❌ <b>TO'LOV RAD ETILDI</b>\n\n"
            f"🛒 Buyurtma: <b>#{tg.esc(order_number)}</b>\n"
            f"💰 Summa: <b>{amount} so'm</b>\n"
            + (f"📝 Sabab: {tg.esc(reason)}\n" if reason else "")
            + f"👨‍💼 Rad etdi: {tg.esc(by_name)}",
        )
        await tg.notify_payment_rejected_to_admins(
            order_number=order_number, customer_name=customer_name, amount=amount,
            reason=reason or "—", rejected_by=by_name,
        )
    except Exception:  # noqa: BLE001
        logger.exception("after_rejected failed for %s", order_number)


async def after_suspicious(order_number: str, amount: str, by_name: str, message_ids: list[int],
                           payment_id: str | None) -> None:
    """Mark admin messages as suspicious but keep approve/reject buttons."""
    try:
        text = (
            f"⚠️ <b>SHUBHALI CHEK</b>\n\n"
            f"🛒 Buyurtma: <b>#{tg.esc(order_number)}</b>\n"
            f"💰 Summa: <b>{amount} so'm</b>\n"
            f"👨‍💼 Belgiladi: {tg.esc(by_name)}\n\n"
            f"<i>Xaridorga tekshiruv haqida xabar yuborildi.</i>"
        )
        keyboard = None
        if payment_id:
            keyboard = {"inline_keyboard": [
                [{"text": "✅ To'lovni tasdiqlash", "callback_data": f"approve_payment:{payment_id}"}],
                [{"text": "❌ Rad etish", "callback_data": f"reject_payment:{payment_id}"}],
            ]}
        for mid in message_ids:
            for aid in settings.TELEGRAM_ADMIN_IDS:
                data = {"chat_id": str(aid), "message_id": mid, "text": text, "parse_mode": "HTML"}
                if keyboard:
                    data["reply_markup"] = keyboard
                await tg._send_request("editMessageText", data)
        await tg.send_telegram_message(
            f"⚠️ <b>To'lov shubhali deb belgilandi</b>\n\n"
            f"Buyurtma: <b>#{tg.esc(order_number)}</b>\n"
            f"Summa: <b>{amount} so'm</b>\n"
            f"Belgiladi: {tg.esc(by_name)}"
        )
    except Exception:  # noqa: BLE001
        logger.exception("after_suspicious failed for %s", order_number)


async def return_stock_for_order(db: AsyncSession, order: Order, user_id: uuid.UUID, reason: str) -> None:
    """Put items back on the shelf — only meaningful if stock was taken (order was paid)."""
    for item in order.items:
        await inventory_service.add_stock(
            db, item.product_variant_id, item.quantity,
            f"#{order.order_number}: {reason}", user_id,
            movement_type=StockMovementType.RETURN, reference_id=order.id,
        )


__all__ = [
    "lock_order", "apply_paid", "apply_rejected", "apply_suspicious",
    "build_delivery_payload", "admin_message_ids", "after_approved",
    "after_rejected", "after_suspicious", "return_stock_for_order",
]
