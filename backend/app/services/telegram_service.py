import json
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"


async def verify_bot_and_setup_webhook() -> bool:
    """Verify bot token works and register webhook. Call on startup."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is empty — Telegram notifications are disabled")
        return False

    result = await _send_request("getMe")
    if not result or not result.get("ok"):
        logger.error("TELEGRAM_BOT_TOKEN is invalid — getMe failed")
        return False

    bot_info = result.get("result", {})
    bot_name = bot_info.get("username", "unknown")
    logger.info(f"Telegram bot connected: @{bot_name}")

    if not settings.TELEGRAM_ADMIN_IDS:
        logger.warning("TELEGRAM_ADMIN_IDS is empty — no admins to notify")

    if settings.BACKEND_BASE_URL:
        webhook_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}{settings.API_V1_STR}/bot/webhook"
        wh_result = await _send_request("setWebhook", {
            "url": webhook_url,
            "allowed_updates": ["callback_query", "message"],
        })
        if wh_result and wh_result.get("ok"):
            logger.info(f"Telegram webhook registered: {webhook_url}")
        else:
            logger.error(f"Failed to register Telegram webhook at {webhook_url}: {wh_result}")
    else:
        logger.warning("BACKEND_BASE_URL not set — Telegram webhook not registered (approve/reject buttons won't work)")

    return True


async def _send_request(method: str, data: dict | None = None, files: dict | None = None) -> dict | None:
    """Low-level Telegram Bot API request."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is empty — skipping %s call", method)
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if files:
                resp = await client.post(f"{TELEGRAM_API}/{method}", data=data, files=files)
            else:
                resp = await client.post(
                    f"{TELEGRAM_API}/{method}",
                    json=data,
                )
            resp_json = resp.json() if resp.status_code == 200 else None
            if resp.status_code == 200 and resp_json and resp_json.get("ok"):
                return resp_json
            else:
                logger.error(
                    "Telegram %s failed: HTTP %s | response: %s | sent data keys: %s",
                    method, resp.status_code, resp.text[:500],
                    list((data or {}).keys()),
                )
                return None
    except Exception as e:
        logger.error("Telegram %s exception: %s", method, e)
        return None


async def send_telegram_message(text: str, photo_url: str | None = None, chat_id: str | None = None) -> bool:
    """Send a simple text or photo message to the group."""
    target = chat_id or settings.TELEGRAM_GROUP_ID
    if not target:
        logger.warning("Telegram group_id not configured")
        return False

    if photo_url:
        result = await _send_request("sendPhoto", {
            "chat_id": target,
            "photo": photo_url,
            "caption": text[:1024],
            "parse_mode": "HTML",
        })
    else:
        result = await _send_request("sendMessage", {
            "chat_id": target,
            "text": text[:4096],
            "parse_mode": "HTML",
        })

    return result is not None


async def send_photo_to_admins(
    photo_path: str,
    caption: str,
    reply_markup: dict | None = None,
) -> list[dict]:
    """Send a photo with inline buttons to all admin users. Returns list of sent message results."""
    results = []
    for admin_id in settings.TELEGRAM_ADMIN_IDS:
        data = {
            "chat_id": str(admin_id),
            "caption": caption[:1024],
            "parse_mode": "HTML",
        }
        if reply_markup:
            data["reply_markup"] = json.dumps(reply_markup)

        try:
            with open(photo_path, "rb") as f:
                result = await _send_request("sendPhoto", data=data, files={"photo": f})
                if result:
                    results.append(result)
        except FileNotFoundError:
            logger.error(f"Receipt file not found: {photo_path}")
            # Fallback: send text-only message
            text_data = {
                "chat_id": str(admin_id),
                "text": caption[:4096],
                "parse_mode": "HTML",
            }
            if reply_markup:
                text_data["reply_markup"] = reply_markup
            result = await _send_request("sendMessage", text_data)
            if result:
                results.append(result)

    return results


async def send_message_to_admins(text: str, reply_markup: dict | None = None) -> list[dict]:
    """Send a text message with optional inline buttons to all admins."""
    results = []
    for admin_id in settings.TELEGRAM_ADMIN_IDS:
        data = {
            "chat_id": str(admin_id),
            "text": text[:4096],
            "parse_mode": "HTML",
        }
        if reply_markup:
            data["reply_markup"] = reply_markup
        result = await _send_request("sendMessage", data)
        if result:
            results.append(result)
        else:
            logger.warning("Failed to send message to admin %s", admin_id)
    return results


async def send_media_group_to_admins(
    photo_urls: list[str],
    local_file_paths: list[str] | None = None,
    caption: str = "",
) -> list[dict]:
    """Send multiple photos as a media group to all admin users.

    Args:
        photo_urls: publicly accessible image URLs (e.g. product images)
        local_file_paths: local file paths to upload (e.g. receipt images)
        caption: HTML caption for the first photo (max 1024 chars)
    """
    results = []
    local_file_paths = local_file_paths or []

    for admin_id in settings.TELEGRAM_ADMIN_IDS:
        media = []
        files_dict = {}
        opened_files = []

        # URL-based photos (product images)
        for i, url in enumerate(photo_urls):
            item = {"type": "photo", "media": url}
            if i == 0:
                item["caption"] = caption[:1024]
                item["parse_mode"] = "HTML"
            media.append(item)

        # Local file photos (receipt, etc.)
        for j, fpath in enumerate(local_file_paths):
            attach_name = f"file_{j}"
            item = {"type": "photo", "media": f"attach://{attach_name}"}
            if not photo_urls and j == 0:
                item["caption"] = caption[:1024]
                item["parse_mode"] = "HTML"
            media.append(item)
            try:
                f = open(fpath, "rb")
                opened_files.append(f)
                files_dict[attach_name] = f
            except FileNotFoundError:
                logger.error(f"File not found: {fpath}")

        if not media:
            continue

        try:
            # sendMediaGroup needs at least 2 items; fall back to sendPhoto for 1
            if len(media) >= 2:
                data = {
                    "chat_id": str(admin_id),
                    "media": json.dumps(media),
                }
                result = await _send_request(
                    "sendMediaGroup",
                    data=data,
                    files=files_dict if files_dict else None,
                )
            else:
                # Single photo fallback
                single = media[0]
                if files_dict:
                    fname = list(files_dict.keys())[0]
                    data = {
                        "chat_id": str(admin_id),
                        "caption": caption[:1024],
                        "parse_mode": "HTML",
                    }
                    result = await _send_request("sendPhoto", data=data, files={"photo": files_dict[fname]})
                else:
                    result = await _send_request("sendPhoto", {
                        "chat_id": str(admin_id),
                        "photo": single["media"],
                        "caption": caption[:1024],
                        "parse_mode": "HTML",
                    })

            if result:
                results.append(result)
        finally:
            for f in opened_files:
                f.close()

    return results


async def send_payment_verification_request(
    payment_id: str,
    order_number: str,
    customer_name: str,
    customer_phone: str,
    amount: str,
    receipt_path: str,
    product_image_urls: list[str] | None = None,
) -> list[dict]:
    """Send all product images + receipt to admins, then Approve/Reject buttons."""
    caption = (
        f"💳 <b>Chek yuklandi — To'lov tekshiruvi</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"\n"
        f"🛒 Buyurtma: <b>#{order_number}</b>\n"
        f"👤 Xaridor: <b>{customer_name}</b>\n"
        f"📞 Telefon: {customer_phone}\n"
        f"💰 Summa: <b>{amount} so'm</b>\n"
        f"\n"
        f"⏳ Tekshiruv kutilmoqda..."
    )

    inline_keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "✅ To'lovni tasdiqlash",
                    "callback_data": f"approve_payment:{payment_id}",
                },
            ],
            [
                {
                    "text": "❌ Rad etish",
                    "callback_data": f"reject_payment:{payment_id}",
                },
                {
                    "text": "🤔 Shubhali",
                    "callback_data": f"suspicious_payment:{payment_id}",
                },
            ],
        ]
    }

    # Step 1: Try sending product images + receipt as media group
    product_urls = product_image_urls or []
    media_sent = False

    if product_urls:
        media_results = await send_media_group_to_admins(
            photo_urls=product_urls,
            local_file_paths=[receipt_path],
            caption=caption,
        )
        media_sent = bool(media_results)

    # Fallback: if media group failed or no product images, send receipt as single photo
    if not media_sent:
        logger.info("Media group skipped/failed — sending receipt as single photo")
        await send_photo_to_admins(
            photo_path=receipt_path,
            caption=caption,
        )

    # Step 2: Send inline buttons as a separate text message to admins
    button_results = await send_message_to_admins(
        text=(
            f"👆 <b>Yuqoridagi rasmlarni tekshiring</b>\n"
            f"Buyurtma: <b>#{order_number}</b> — {amount} so'm\n\n"
            f"Amalni tanlang:"
        ),
        reply_markup=inline_keyboard,
    )

    return button_results


async def answer_callback_query(callback_query_id: str, text: str = "") -> bool:
    """Answer a Telegram inline button callback."""
    result = await _send_request("answerCallbackQuery", {
        "callback_query_id": callback_query_id,
        "text": text[:200],
        "show_alert": True,
    })
    return result is not None


async def edit_message_caption(chat_id: str, message_id: int, caption: str) -> bool:
    """Edit the caption of a previously sent photo message."""
    result = await _send_request("editMessageCaption", {
        "chat_id": chat_id,
        "message_id": message_id,
        "caption": caption[:1024],
        "parse_mode": "HTML",
    })
    return result is not None


async def send_force_reply(chat_id: str, text: str) -> dict | None:
    """Send a message that forces the user to reply."""
    return await _send_request("sendMessage", {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {"force_reply": True, "selective": True},
    })


async def notify_payment_approved(
    order_number: str,
    customer_name: str,
    customer_phone: str,
    amount: str,
    address: str,
    items_text: str,
    approved_by: str,
    product_image_urls: list[str] | None = None,
) -> bool:
    """Send approved order notification with product images to channel for delivery staff."""
    target = settings.TELEGRAM_GROUP_ID
    if not target:
        logger.warning("TELEGRAM_GROUP_ID not configured — skipping channel notification")
        return False
    logger.info(f"Sending approved order notification to channel {target}")

    text = (
        f"✅ <b>To'lov tasdiqlandi — Yetkazishga tayyor!</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"\n"
        f"🛒 Buyurtma: <b>#{order_number}</b>\n"
        f"👤 Xaridor: <b>{customer_name}</b>\n"
        f"📞 Telefon: {customer_phone}\n"
        f"💰 Summa: <b>{amount} so'm</b>\n"
        f"\n"
        f"📦 <b>Tovarlar:</b>\n"
        f"{items_text}\n"
        f"\n"
        f"📍 <b>Yetkazish manzili:</b>\n"
        f"  {address}\n"
        f"\n"
        f"👨‍💼 Tasdiqlagan: {approved_by}\n"
        f"\n"
        f"🚚 <b>Buyurtmani yetkazishga tayyorlang!</b>"
    )

    urls = [u for u in (product_image_urls or []) if u and u.startswith("http")]
    if urls:
        media = []
        for i, url in enumerate(urls):
            item = {"type": "photo", "media": url}
            if i == 0:
                item["caption"] = text[:1024]
                item["parse_mode"] = "HTML"
            media.append(item)

        if len(media) >= 2:
            result = await _send_request("sendMediaGroup", {
                "chat_id": str(target),
                "media": json.dumps(media),
            })
        else:
            result = await _send_request("sendPhoto", {
                "chat_id": str(target),
                "photo": urls[0],
                "caption": text[:1024],
                "parse_mode": "HTML",
            })

        if result:
            return True
        logger.info("Channel media group failed — falling back to text-only")

    return await send_telegram_message(text)


async def notify_payment_rejected_to_admins(
    order_number: str,
    customer_name: str,
    amount: str,
    reason: str,
    rejected_by: str,
) -> bool:
    """Notify admins about payment rejection."""
    text = (
        f"❌ <b>Оплата отклонена</b>\n"
        f"\n"
        f"🛒 Заказ: <b>#{order_number}</b>\n"
        f"👤 Покупатель: {customer_name}\n"
        f"💰 Сумма: {amount} сум\n"
        f"📝 Причина: {reason}\n"
        f"👨‍💼 Отклонил: {rejected_by}"
    )
    return await send_telegram_message(text)


# ============================================================
# Legacy functions (backward compatible)
# ============================================================


def format_order_notification(
    order_id: str,
    order_number: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    address: str,
    items: list[dict],
    total: str,
    payment_method: str,
    payment_status: str,
    created_at: datetime | None = None,
) -> tuple[str, list[str]]:
    """Format order notification text and collect ALL product image URLs."""
    now = created_at or datetime.now(timezone.utc)
    time_str = now.strftime("%d.%m.%Y %H:%M")

    status_emoji = {
        "pending": "🕐 Ожидает",
        "paid": "✅ Оплачен",
        "failed": "❌ Ошибка",
        "refunded": "↩️ Возврат",
    }
    pay_status = status_emoji.get(payment_status, payment_status)

    method_map = {
        "cash": "💵 Наличные",
        "payme": "💳 Payme",
        "click": "💳 Click",
        "card": "💳 Карта",
        "card_transfer": "💳 Карта→карта перевод",
        "bank_transfer": "🏦 Банковский перевод",
    }
    pay_method = method_map.get(payment_method, payment_method)

    items_text = ""
    all_images: list[str] = []
    for item in items:
        items_text += f"  • {item['name']}"
        if item.get("size"):
            items_text += f" (размер: {item['size']})"
        if item.get("color"):
            items_text += f" [{item['color']}]"
        items_text += f" × {item['quantity']} = {item['subtotal']}\n"
        if item.get("image"):
            all_images.append(item["image"])

    text = (
        f"🛒 <b>Новый заказ #{order_number}</b>\n"
        f"📅 {time_str}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"\n"
        f"👤 <b>Покупатель:</b>\n"
        f"  Имя: {customer_name}\n"
        f"  Тел: {customer_phone}\n"
        f"  Email: {customer_email}\n"
        f"\n"
        f"📦 <b>Товары:</b>\n"
        f"{items_text}\n"
        f"💰 <b>Итого: {total} сум</b>\n"
        f"\n"
        f"📍 <b>Адрес доставки:</b>\n"
        f"  {address}\n"
        f"\n"
        f"💳 <b>Оплата:</b> {pay_method}\n"
        f"📋 <b>Статус:</b> {pay_status}\n"
    )

    return text, all_images


async def notify_new_order(
    order_id: str,
    order_number: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    address: str,
    items: list[dict],
    total: str,
    payment_method: str,
    payment_status: str,
    created_at: datetime | None = None,
) -> bool:
    """Send new order notification with ALL product images to admins' personal chats only."""
    text, all_images = format_order_notification(
        order_id=order_id,
        order_number=order_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        address=address,
        items=items,
        total=total,
        payment_method=payment_method,
        payment_status=payment_status,
        created_at=created_at,
    )

    # Try sending product images as media group; fall back to text-only
    if all_images:
        results = await send_media_group_to_admins(
            photo_urls=all_images,
            caption=text,
        )
        if not results:
            logger.info("Media group failed for new order — falling back to text-only")
            await send_message_to_admins(text)
    else:
        await send_message_to_admins(text)

    return True

