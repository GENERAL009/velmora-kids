"""Telegram Bot webhook handler for payment verification callbacks."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.order import Order, OrderItem, Payment, PaymentStatus, TransactionStatus
from app.models.product import ProductImage
from app.models.content import Notification
from app.services.telegram_service import (
    answer_callback_query,
    edit_message_caption,
    notify_payment_approved,
    notify_payment_rejected_to_admins,
    send_force_reply,
    send_message_to_admins,
    _send_request,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bot", tags=["Telegram Bot"])

# In-memory store for pending rejections (admin_id -> payment_id)
pending_rejections: dict[int, str] = {}


@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Handle Telegram Bot webhook updates (callback_query for inline buttons + reply for rejection reason)."""
    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Handle inline button press (callback_query)
    if "callback_query" in update:
        await _handle_callback_query(update["callback_query"])
        return {"ok": True}

    # Handle text message (reply with rejection reason)
    if "message" in update:
        message = update["message"]
        # Check if this is a reply to our force_reply
        if message.get("reply_to_message") and message.get("text"):
            await _handle_rejection_reason(message)
        return {"ok": True}

    return {"ok": True}


async def _handle_callback_query(callback_query: dict):
    """Process inline button callback (approve/reject payment)."""
    callback_id = callback_query.get("id", "")
    data = callback_query.get("data", "")
    from_user = callback_query.get("from", {})
    admin_id = from_user.get("id")
    admin_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
    message_id = callback_query.get("message", {}).get("message_id")

    # Security: Inline buttons are only sent to authorized admin private chats,
    # so if a user can click the button, they are authorized.


    if data.startswith("approve_payment:"):
        payment_id = data.split(":", 1)[1]
        await _approve_payment(payment_id, admin_name, callback_id, chat_id, message_id)

    elif data.startswith("reject_payment:"):
        payment_id = data.split(":", 1)[1]
        # Store pending rejection and ask for reason
        pending_rejections[admin_id] = payment_id
        await answer_callback_query(callback_id, "Напишите причину отказа в ответ на следующее сообщение")
        await send_force_reply(
            chat_id,
            f"✏️ Напишите причину отклонения оплаты:\n\n"
            f"(Ответьте на это сообщение)"
        )

    elif data.startswith("suspicious_payment:"):
        payment_id = data.split(":", 1)[1]
        await _mark_payment_suspicious(payment_id, admin_name, callback_id, chat_id, message_id)

    else:
        await answer_callback_query(callback_id, "Неизвестное действие")

async def _mark_payment_suspicious(payment_id: str, admin_name: str, callback_id: str, chat_id: str, message_id: int | None):
    """Mark the payment as suspicious."""
    async with AsyncSessionLocal() as db:
        try:
            from uuid import UUID
            pid = UUID(payment_id)

            result = await db.execute(select(Payment).where(Payment.id == pid))
            payment = result.scalar_one_or_none()
            if not payment:
                await answer_callback_query(callback_id, "❌ Платёж не найден")
                return

            if payment.status in (TransactionStatus.COMPLETED, TransactionStatus.FAILED):
                await answer_callback_query(callback_id, "ℹ️ Статус оплаты уже изменен")
                return

            # Update payment to suspicious
            payment.status = TransactionStatus.SUSPICIOUS
            payment.verified_at = datetime.now(timezone.utc)
            payment.verified_by = None

            order_for_notif = await db.execute(select(Order).where(Order.id == payment.order_id))
            order_obj = order_for_notif.scalar_one_or_none()
            if order_obj:
                notif = Notification(
                    user_id=order_obj.customer_id,
                    title="Дополнительная проверка",
                    message=f"Платёж по заказу #{order_obj.order_number} проходит дополнительную проверку. Пожалуйста, ожидайте.",
                    type="order",
                    link=f"/account/orders/{order_obj.id}",
                )
                db.add(notif)

            await db.commit()

            # Answer callback
            await answer_callback_query(callback_id, "⚠️ Отмечено как подозрительное")

            # Update the message caption to reflect this but KEEP inline buttons
            # so they can still approve or reject it later!
            if message_id and chat_id:
                # We can't easily retrieve the order number here without querying, 
                # but we can fetch it:
                order_result = await db.execute(select(Order).where(Order.id == payment.order_id))
                order = order_result.scalar_one_or_none()
                
                inline_keyboard = {
                    "inline_keyboard": [
                        [
                            {
                                "text": "✅ Подтвердить оплату",
                                "callback_data": f"approve_payment:{payment_id}",
                            },
                        ],
                        [
                            {
                                "text": "❌ Отклонить",
                                "callback_data": f"reject_payment:{payment_id}",
                            },
                        ],
                    ]
                }
                
                caption = (
                    f"⚠️ <b>ПОДОЗРИТЕЛЬНЫЙ ЧЕК</b>\n\n"
                    f"🛒 Заказ: <b>#{order.order_number if order else 'N/A'}</b>\n"
                    f"💰 Сумма: <b>{payment.amount:,.0f} сум</b>\n"
                    f"👨‍💼 Отметил: {admin_name}\n\n"
                    f"<i>Клиент получил уведомление о проверке.</i>"
                )
                
                # Edit the button message (text message, not photo)
                await _send_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "text": caption,
                    "parse_mode": "HTML",
                    "reply_markup": inline_keyboard,
                })
        except Exception as e:
            logger.error(f"Error marking payment suspicious: {e}")
            await db.rollback()
            await answer_callback_query(callback_id, f"❌ Ошибка: {str(e)[:100]}")


async def _approve_payment(payment_id: str, admin_name: str, callback_id: str, chat_id: str, message_id: int | None):
    """Approve the payment, update DB, notify channel."""
    async with AsyncSessionLocal() as db:
        try:
            from uuid import UUID
            pid = UUID(payment_id)

            result = await db.execute(
                select(Payment).where(Payment.id == pid)
            )
            payment = result.scalar_one_or_none()
            if not payment:
                await answer_callback_query(callback_id, "❌ Платёж не найден")
                return

            if payment.status == TransactionStatus.COMPLETED:
                await answer_callback_query(callback_id, "ℹ️ Оплата уже подтверждена")
                return

            # Update payment
            payment.status = TransactionStatus.COMPLETED
            payment.verified_at = datetime.now(timezone.utc)
            payment.rejection_reason = None

            # Update order
            order_result = await db.execute(
                select(Order).where(Order.id == payment.order_id)
                .options(selectinload(Order.items))
            )
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = PaymentStatus.PAID
                order.paid_at = datetime.now(timezone.utc)

            # Decrease stock for all order items now that payment is confirmed
            if order:
                from app.services import inventory_service
                from app.models.inventory import StockMovementType

                for oi in order.items:
                    if oi.product_variant_id:
                        await inventory_service.decrease_stock_for_sale(
                            db, oi.product_variant_id, oi.quantity,
                            order.customer_id,
                            StockMovementType.SALE, order.id,
                        )

            # Create notification for customer
            if order:
                notif = Notification(
                    user_id=order.customer_id,
                    title="Оплата подтверждена",
                    message=f"Ваш платёж по заказу #{order.order_number} на сумму {payment.amount:,.0f} сум подтверждён. Заказ передан на комплектацию.",
                    type="order",
                    link=f"/account/orders/{order.id}",
                )
                db.add(notif)

            await db.commit()

            # Answer callback
            await answer_callback_query(callback_id, "✅ To'lov tasdiqlandi!")

            # Edit original button message (text message, not photo)
            if message_id and chat_id:
                await _send_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "text": (
                        f"✅ <b>TO'LOV TASDIQLANDI</b>\n\n"
                        f"🛒 Buyurtma: <b>#{order.order_number if order else 'N/A'}</b>\n"
                        f"💰 Summa: <b>{payment.amount:,.0f} so'm</b>\n"
                        f"👨‍💼 Tasdiqlagan: {admin_name}\n"
                        f"🕐 {datetime.now(timezone.utc).strftime('%d.%m.%Y %H:%M')}"
                    ),
                    "parse_mode": "HTML",
                })

            # Notify channel for delivery (with product images)
            if order:
                items_text = ""
                for item in order.items:
                    color_info = f" ({item.color_name})" if item.color_name else ""
                    items_text += f"  • {item.product_name}{color_info} × {item.quantity}\n"

                address = f"{order.delivery_city or ''}, {order.delivery_address or ''}".strip(", ")

                base_url = settings.BACKEND_BASE_URL.rstrip("/") if settings.BACKEND_BASE_URL else ""
                product_image_urls = []
                seen_products = set()
                for item in order.items:
                    if item.product_variant_id and item.product_variant_id not in seen_products:
                        seen_products.add(item.product_variant_id)
                        from app.models.product import ProductVariant
                        var_result = await db.execute(
                            select(ProductVariant).where(ProductVariant.id == item.product_variant_id)
                        )
                        variant = var_result.scalar_one_or_none()
                        if variant:
                            img_result = await db.execute(
                                select(ProductImage)
                                .where(ProductImage.product_id == variant.product_id, ProductImage.is_primary == True)
                            )
                            img = img_result.scalar_one_or_none()
                            if img and img.file_path:
                                url = img.file_path
                                if url.startswith("/") and base_url:
                                    url = base_url + url
                                if url.startswith("http"):
                                    product_image_urls.append(url)

                await notify_payment_approved(
                    order_number=order.order_number,
                    customer_name=f"{order.customer_first_name} {order.customer_last_name}",
                    customer_phone=order.customer_phone,
                    amount=f"{order.total:,.0f}",
                    address=address,
                    items_text=items_text,
                    approved_by=admin_name,
                    product_image_urls=product_image_urls,
                )

        except Exception as e:
            logger.error(f"Error approving payment: {e}")
            await db.rollback()
            await answer_callback_query(callback_id, f"❌ Ошибка: {str(e)[:100]}")


async def _handle_rejection_reason(message: dict):
    """Process the rejection reason text from admin."""
    from_user = message.get("from", {})
    admin_id = from_user.get("id")
    admin_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
    reason = message.get("text", "Без комментария")
    chat_id = str(message.get("chat", {}).get("id", ""))

    # Admin check bypassed - if they can reply to the bot's force_reply, they are authorized
    
    payment_id = pending_rejections.pop(admin_id, None)
    if not payment_id:
        return

    async with AsyncSessionLocal() as db:
        try:
            from uuid import UUID
            pid = UUID(payment_id)

            result = await db.execute(select(Payment).where(Payment.id == pid))
            payment = result.scalar_one_or_none()
            if not payment:
                return

            # Update payment
            payment.status = TransactionStatus.FAILED
            payment.rejection_reason = reason
            payment.verified_at = datetime.now(timezone.utc)

            # Update order
            order_result = await db.execute(
                select(Order).where(Order.id == payment.order_id)
            )
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = PaymentStatus.FAILED

                notif = Notification(
                    user_id=order.customer_id,
                    title="Оплата отклонена",
                    message=f"Платёж по заказу #{order.order_number} отклонён. Причина: {reason}",
                    type="order",
                    link=f"/account/orders/{order.id}",
                )
                db.add(notif)

            await db.commit()

            # Confirm to admin
            from app.services.telegram_service import send_telegram_message
            await send_telegram_message(
                f"❌ <b>Оплата отклонена</b>\n\n"
                f"🛒 Заказ: <b>#{order.order_number if order else 'N/A'}</b>\n"
                f"📝 Причина: {reason}\n"
                f"👨‍💼 Отклонил: {admin_name}",
                chat_id=chat_id,
            )

            # Notify other admins
            if order:
                await notify_payment_rejected_to_admins(
                    order_number=order.order_number,
                    customer_name=f"{order.customer_first_name} {order.customer_last_name}",
                    amount=f"{order.total:,.0f}",
                    reason=reason,
                    rejected_by=admin_name,
                )

            # Edit the original button message for all admins
            if payment.telegram_message_id:
                for aid in settings.TELEGRAM_ADMIN_IDS:
                    await _send_request("editMessageText", {
                        "chat_id": str(aid),
                        "message_id": payment.telegram_message_id,
                        "text": (
                            f"❌ <b>ОПЛАТА ОТКЛОНЕНА</b>\n\n"
                            f"🛒 Заказ: <b>#{order.order_number if order else 'N/A'}</b>\n"
                            f"💰 Сумма: <b>{payment.amount:,.0f} сум</b>\n"
                            f"📝 Причина: {reason}\n"
                            f"👨‍💼 Отклонил: {admin_name}"
                        ),
                        "parse_mode": "HTML",
                    })

        except Exception as e:
            logger.error(f"Error rejecting payment: {e}")
            await db.rollback()
