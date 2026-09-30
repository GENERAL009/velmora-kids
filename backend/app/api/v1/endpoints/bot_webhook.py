"""Telegram Bot webhook handler for payment verification callbacks."""
import hmac
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.order import Payment
from app.services import payment_flow
from app.services.telegram_service import (
    answer_callback_query,
    esc,
    is_admin,
    send_force_reply,
    send_telegram_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bot", tags=["Telegram Bot"])

# Pending "reject" actions waiting for the admin to type a reason.
# Stored in Redis so it works with several uvicorn workers; in-memory is only a fallback.
_PENDING_TTL = 15 * 60
_pending_fallback: dict[int, str] = {}


async def _set_pending(admin_id: int, payment_id: str) -> None:
    from app.core.cache import get_redis
    try:
        r = await get_redis()
        await r.set(f"tg:pending_reject:{admin_id}", payment_id, ex=_PENDING_TTL)
        return
    except Exception as e:  # noqa: BLE001
        logger.warning("Redis unavailable for pending rejection: %s", e)
    _pending_fallback[admin_id] = payment_id


async def _pop_pending(admin_id: int) -> str | None:
    from app.core.cache import get_redis
    try:
        r = await get_redis()
        key = f"tg:pending_reject:{admin_id}"
        value = await r.get(key)
        if value:
            await r.delete(key)
            return value
    except Exception as e:  # noqa: BLE001
        logger.warning("Redis unavailable for pending rejection: %s", e)
    return _pending_fallback.pop(admin_id, None)


def _verify_secret(request: Request) -> None:
    expected = settings.telegram_webhook_secret
    received = request.headers.get("x-telegram-bot-api-secret-token", "")
    if not expected or not hmac.compare_digest(received, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/webhook")
async def telegram_webhook(request: Request, background: BackgroundTasks):
    """Telegram updates: inline button presses and replies with a rejection reason."""
    _verify_secret(request)
    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if "callback_query" in update:
        await _handle_callback_query(update["callback_query"], background)
    elif "message" in update:
        message = update["message"]
        if message.get("reply_to_message") and message.get("text"):
            await _handle_rejection_reason(message, background)
    return {"ok": True}


def _parse_payment_id(raw: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        return None


async def _handle_callback_query(callback_query: dict, background: BackgroundTasks):
    callback_id = callback_query.get("id", "")
    data = callback_query.get("data", "") or ""
    from_user = callback_query.get("from", {}) or {}
    admin_id = from_user.get("id")
    admin_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip() or "Admin"
    chat_id = str((callback_query.get("message") or {}).get("chat", {}).get("id", ""))

    if not is_admin(admin_id):
        logger.warning("Callback from non-admin telegram user %s ignored", admin_id)
        await answer_callback_query(callback_id, "⛔ Sizda bu amal uchun ruxsat yo'q")
        return

    action, _, raw_id = data.partition(":")
    payment_id = _parse_payment_id(raw_id)
    if action not in ("approve_payment", "reject_payment", "suspicious_payment") or payment_id is None:
        await answer_callback_query(callback_id, "Noma'lum amal")
        return

    if action == "reject_payment":
        await _set_pending(int(admin_id), str(payment_id))
        await answer_callback_query(callback_id, "Keyingi xabarga javob sifatida rad etish sababini yozing")
        await send_force_reply(chat_id, "✏️ To'lovni rad etish sababini yozing:\n\n(Shu xabarga javob bering)")
        return

    async with AsyncSessionLocal() as db:
        try:
            payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
            if not payment:
                await answer_callback_query(callback_id, "❌ To'lov topilmadi")
                return
            order = await payment_flow.lock_order(db, payment.order_id)
            if not order:
                await answer_callback_query(callback_id, "❌ Buyurtma topilmadi")
                return

            if action == "approve_payment":
                changed = await payment_flow.apply_paid(
                    db, order, by_user_id=None, by_name=admin_name, source="telegram",
                )
                if not changed:
                    await answer_callback_query(callback_id, "ℹ️ To'lov allaqachon tasdiqlangan")
                    return
                payload = await payment_flow.build_delivery_payload(db, order, admin_name)
                message_ids = payment_flow.admin_message_ids(order)
                await db.commit()
                await answer_callback_query(callback_id, "✅ To'lov tasdiqlandi!")
                background.add_task(payment_flow.after_approved, payload, message_ids)
            else:  # suspicious
                changed = await payment_flow.apply_suspicious(
                    db, order, by_user_id=None, by_name=admin_name, source="telegram",
                )
                if not changed:
                    await answer_callback_query(callback_id, "ℹ️ To'lov holati allaqachon o'zgargan")
                    return
                message_ids = payment_flow.admin_message_ids(order)
                amount = f"{order.total:,.0f}"
                await db.commit()
                await answer_callback_query(callback_id, "⚠️ Shubhali deb belgilandi")
                background.add_task(
                    payment_flow.after_suspicious, order.order_number, amount, admin_name,
                    message_ids, str(payment_id),
                )
        except Exception as e:  # noqa: BLE001
            logger.exception("Telegram callback %s failed", action)
            await db.rollback()
            await answer_callback_query(callback_id, f"❌ Xatolik: {str(e)[:100]}")


async def _handle_rejection_reason(message: dict, background: BackgroundTasks):
    from_user = message.get("from", {}) or {}
    admin_id = from_user.get("id")
    if not is_admin(admin_id):
        return
    admin_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip() or "Admin"
    reason = (message.get("text") or "").strip()[:1000] or "Izohsiz"
    chat_id = str(message.get("chat", {}).get("id", ""))

    raw = await _pop_pending(int(admin_id))
    payment_id = _parse_payment_id(raw) if raw else None
    if not payment_id:
        return

    async with AsyncSessionLocal() as db:
        try:
            payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
            if not payment:
                return
            order = await payment_flow.lock_order(db, payment.order_id)
            if not order:
                return
            changed = await payment_flow.apply_rejected(
                db, order, reason=reason, by_user_id=None, by_name=admin_name, source="telegram",
            )
            if not changed:
                await send_telegram_message("ℹ️ Bu to'lov allaqachon tasdiqlangan — rad etib bo'lmaydi.", chat_id=chat_id)
                return
            message_ids = payment_flow.admin_message_ids(order)
            order_number = order.order_number
            customer_name = f"{order.customer_first_name} {order.customer_last_name}"
            amount = f"{order.total:,.0f}"
            await db.commit()
            await send_telegram_message(
                f"❌ <b>To'lov rad etildi</b>\n\n"
                f"🛒 Buyurtma: <b>#{esc(order_number)}</b>\n"
                f"📝 Sabab: {esc(reason)}",
                chat_id=chat_id,
            )
            background.add_task(
                payment_flow.after_rejected, order_number, customer_name, amount, reason,
                admin_name, message_ids,
            )
        except Exception:  # noqa: BLE001
            logger.exception("Rejecting payment failed")
            await db.rollback()

