import html
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

# Photos Telegram can't render as "photo" are sent as documents instead
_DOCUMENT_EXTS = (".heic", ".heif", ".avif")


def esc(value) -> str:
    """Escape user-provided text for Telegram HTML parse mode."""
    return html.escape("" if value is None else str(value), quote=False)


def is_admin(telegram_user_id) -> bool:
    try:
        return int(telegram_user_id) in {int(a) for a in settings.TELEGRAM_ADMIN_IDS}
    except (TypeError, ValueError):
        return False


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
            "secret_token": settings.telegram_webhook_secret,
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
            as_document = photo_path.lower().endswith(_DOCUMENT_EXTS)
            with open(photo_path, "rb") as f:
                if as_document:
                    result = await _send_request("sendDocument", data=data, files={"document": f})
                else:
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
        f"👤 Xaridor: <b>{esc(customer_name)}</b>\n"
        f"📞 Telefon: {esc(customer_phone)}\n"
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

    receipt_is_photo = not receipt_path.lower().endswith(_DOCUMENT_EXTS)
    if product_urls and receipt_is_photo:
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


async def send_location(
    chat_id: str,
    latitude: float | Decimal,
    longitude: float | Decimal,
    reply_to_message_id: int | None = None,
) -> dict | None:
    """Send a map pin (Telegram location) to a chat."""
    data: dict = {
        "chat_id": str(chat_id),
        "latitude": float(latitude),
        "longitude": float(longitude),
    }
    if reply_to_message_id:
        data["reply_parameters"] = {"message_id": reply_to_message_id, "allow_sending_without_reply": True}
    return await _send_request("sendLocation", data)


def _first_message_id(result: dict | None) -> int | None:
    if not result:
        return None
    res = result.get("result")
    if isinstance(res, list) and res:
        return res[0].get("message_id")
    if isinstance(res, dict):
        return res.get("message_id")
    return None


def yandex_maps_link(latitude, longitude) -> str:
    return f"https://yandex.uz/maps/?pt={float(longitude)},{float(latitude)}&z=17&l=map"


async def notify_payment_approved(
    order_number: str,
    customer_name: str,
    customer_phone: str,
    amount: str,
    address: str,
    items_text: str,
    approved_by: str,
    product_image_urls: list[str] | None = None,
    latitude: float | Decimal | None = None,
    longitude: float | Decimal | None = None,
    payment_label: str | None = None,
) -> bool:
    """Send approved order to the delivery channel: text + product photos, then the map location.

    `items_text` is expected to be already HTML-escaped by the caller.
    """
    target = settings.TELEGRAM_GROUP_ID
    if not target:
        logger.warning("TELEGRAM_GROUP_ID not configured — skipping channel notification")
        return False
    logger.info("Sending approved order notification to channel %s", target)

    has_location = latitude is not None and longitude is not None
    map_line = ""
    if has_location:
        map_line = f'\n  🗺 <a href="{yandex_maps_link(latitude, longitude)}">Yandex xaritada ochish</a>'

    payment_line = f"💳 To'lov: {esc(payment_label)}\n" if payment_label else ""

    text = (
        f"✅ <b>To'lov tasdiqlandi — Yetkazishga tayyor!</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"\n"
        f"🛒 Buyurtma: <b>#{esc(order_number)}</b>\n"
        f"👤 Xaridor: <b>{esc(customer_name)}</b>\n"
        f"📞 Telefon: {esc(customer_phone)}\n"
        f"💰 Summa: <b>{amount} so'm</b>\n"
        f"{payment_line}"
        f"\n"
        f"📦 <b>Tovarlar:</b>\n"
        f"{items_text}\n"
        f"\n"
        f"📍 <b>Yetkazish manzili:</b>\n"
        f"  {esc(address) or '—'}{map_line}\n"
        f"\n"
        f"👨‍💼 Tasdiqlagan: {esc(approved_by)}\n"
        f"\n"
        f"🚚 <b>Buyurtmani yetkazishga tayyorlang!</b>"
    )

    sent: dict | None = None
    urls = [u for u in (product_image_urls or []) if u and u.startswith("http")]
    caption_fits = len(text) <= 1024
    if urls:
        media = []
        for i, url in enumerate(urls[:10]):
            item = {"type": "photo", "media": url}
            if i == 0 and caption_fits:
                item["caption"] = text
                item["parse_mode"] = "HTML"
            media.append(item)

        if len(media) >= 2:
            sent = await _send_request("sendMediaGroup", {
                "chat_id": str(target),
                "media": json.dumps(media),
            })
        else:
            photo_data = {"chat_id": str(target), "photo": urls[0]}
            if caption_fits:
                photo_data.update({"caption": text, "parse_mode": "HTML"})
            sent = await _send_request("sendPhoto", photo_data)
        if not sent:
            logger.info("Channel media group failed — falling back to text-only")
        elif not caption_fits:
            sent = None  # photos went out without caption; send the text below

    if not sent:
        sent = await _send_request("sendMessage", {
            "chat_id": str(target),
            "text": text[:4096],
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        })

    if has_location:
        loc = await send_location(target, latitude, longitude, reply_to_message_id=_first_message_id(sent))
        if not loc:
            logger.warning("Failed to send location for order %s", order_number)

    return sent is not None


async def notify_payment_rejected_to_admins(
    order_number: str,
    customer_name: str,
    amount: str,
    reason: str,
    rejected_by: str,
) -> bool:
    """Notify the group about payment rejection."""
    text = (
        f"❌ <b>To'lov rad etildi</b>\n"
        f"\n"
        f"🛒 Buyurtma: <b>#{esc(order_number)}</b>\n"
        f"👤 Xaridor: {esc(customer_name)}\n"
        f"💰 Summa: {amount} so'm\n"
        f"📝 Sabab: {esc(reason)}\n"
        f"👨‍💼 Rad etdi: {esc(rejected_by)}"
    )
    return await send_telegram_message(text)


PAYMENT_METHOD_LABELS = {
    "cash": "💵 Naqd pul",
    "payme": "💳 Payme",
    "click": "💳 Click",
    "card_transfer": "💳 Kartadan kartaga",
    "bank_transfer": "🏦 Bank o'tkazmasi",
}


async def notify_new_order(
    order_number: str,
    customer_name: str,
    customer_phone: str,
    address: str,
    items: list[dict],
    subtotal: str,
    discount: str,
    delivery_fee: str,
    total: str,
    payment_method: str,
    comment: str | None = None,
    has_location: bool = False,
) -> bool:
    """Send a new-order notification (text only) to admins' personal chats."""
    now = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M")
    items_text = "".join(
        f"  • {esc(i['name'])}"
        + (f" [{esc(i['color'])}]" if i.get("color") else "")
        + f" × {i['quantity']} = {i['total']}\n"
        for i in items
    )
    lines = [
        f"🛒 <b>Yangi buyurtma #{esc(order_number)}</b>",
        f"📅 {now} (UTC)",
        "━━━━━━━━━━━━━━━━━━",
        "",
        f"👤 {esc(customer_name)}",
        f"📞 {esc(customer_phone)}",
        "",
        "📦 <b>Tovarlar:</b>",
        items_text,
        f"Oraliq summa: {subtotal} so'm",
    ]
    if discount and discount != "0":
        lines.append(f"Chegirma: −{discount} so'm")
    if delivery_fee and delivery_fee != "0":
        lines.append(f"Yetkazish: {delivery_fee} so'm")
    lines += [
        f"💰 <b>Jami: {total} so'm</b>",
        "",
        f"📍 {esc(address) or '—'}" + (" (xaritada belgilangan)" if has_location else ""),
        f"💳 {PAYMENT_METHOD_LABELS.get(payment_method, esc(payment_method))}",
    ]
    if comment:
        lines.append(f"💬 {esc(comment)}")
    await send_message_to_admins("\n".join(lines))
    return True
