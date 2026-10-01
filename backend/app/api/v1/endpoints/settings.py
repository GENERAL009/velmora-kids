import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException

logger = logging.getLogger(__name__)
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.core.config import settings as app_settings
from app.utils.uploads import IMAGE_TYPES, LOGO_TYPES, VIDEO_TYPES, save_upload

router = APIRouter(prefix="/settings", tags=["Site Settings"])

SETTINGS_FILE = Path(app_settings.UPLOAD_DIR) / "data" / "site_settings.json"

DEFAULT_SETTINGS: dict[str, Any] = {
    "phone_primary": "+998 71 200 00 00",
    "phone_secondary": "",
    "email": "info@velmora.uz",
    "instagram_url": "https://instagram.com/velmora.kids",
    "telegram_url": "https://t.me/velmorakids",
    "facebook_url": "https://facebook.com/velmorakids",
    "tiktok_url": "",
    "address": "Ташкент, Узбекистан",
    "working_hours": "Пн-Пт: 09:00 - 18:00",
    "hero_video_url": "",
    "hero_video_url_dark": "",
    "hero_video_poster": "",
    "hero_video_poster_dark": "",
    "hero_girls_image_light": "",
    "hero_girls_image_dark": "",
    "hero_boys_image_light": "",
    "hero_boys_image_dark": "",
    "logo_header": "",
    "logo_footer": "",
    "logo_favicon": "",
    "promo_banner_title": "Сезонная распродажа",
    "promo_banner_subtitle": "Скидки до 50% на избранные коллекции",
    "footer_about": "Velmora Kids — магазин детских колясок, велосипедов, самокатов и электромобилей в Узбекистане.",
    "meta_title": "Velmora Kids — коляски, велосипеды, самокаты и электромобили для детей",
    "meta_description": "Интернет-магазин детского транспорта: коляски, велосипеды, беговелы, самокаты и детские электромобили. Доставка по всему Узбекистану.",
    "payment_card_number": "",
    "payment_card_holder": "",
    "payment_card_bank": "Uzcard",
    "payment_bank_name": "",
    "payment_bank_account": "",
    "payment_bank_mfo": "",
    "payment_bank_inn": "",
}


def _read_settings() -> dict[str, Any]:
    merged = DEFAULT_SETTINGS.copy()
    if SETTINGS_FILE.exists():
        merged.update(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
    return merged


def _write_settings(data: dict[str, Any]) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class SiteSettingsUpdate(BaseModel):
    phone_primary: str | None = None
    phone_secondary: str | None = None
    email: str | None = None
    instagram_url: str | None = None
    telegram_url: str | None = None
    facebook_url: str | None = None
    tiktok_url: str | None = None
    address: str | None = None
    working_hours: str | None = None
    hero_video_url: str | None = None
    hero_video_url_dark: str | None = None
    hero_video_poster: str | None = None
    hero_video_poster_dark: str | None = None
    hero_girls_image_light: str | None = None
    hero_girls_image_dark: str | None = None
    hero_boys_image_light: str | None = None
    hero_boys_image_dark: str | None = None
    logo_header: str | None = None
    logo_footer: str | None = None
    logo_favicon: str | None = None
    promo_banner_title: str | None = None
    promo_banner_subtitle: str | None = None
    footer_about: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    payment_card_number: str | None = None
    payment_card_holder: str | None = None
    payment_card_bank: str | None = None
    payment_bank_name: str | None = None
    payment_bank_account: str | None = None
    payment_bank_mfo: str | None = None
    payment_bank_inn: str | None = None


@router.get("/site")
async def get_site_settings():
    data = _read_settings()
    data["delivery_fee_courier"] = app_settings.DELIVERY_FEE_COURIER
    data["free_delivery_from"] = app_settings.FREE_DELIVERY_FROM
    return data


@router.put("/site")
async def update_site_settings(
    body: SiteSettingsUpdate,
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    current = _read_settings()
    updates = body.model_dump(exclude_none=True)
    current.update(updates)
    _write_settings(current)
    return current


UPLOAD_FIELDS = {
    "hero_video_url", "hero_video_url_dark",
    "hero_video_poster", "hero_video_poster_dark",
    "hero_girls_image_light", "hero_girls_image_dark",
    "hero_boys_image_light", "hero_boys_image_dark",
    "logo_header", "logo_footer", "logo_favicon",
}


@router.post("/upload")
async def upload_setting_file(
    field: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    if field not in UPLOAD_FIELDS:
        raise HTTPException(400, f"Invalid field: {field}. Allowed: {', '.join(sorted(UPLOAD_FIELDS))}")

    is_video = field in ("hero_video_url", "hero_video_url_dark")
    if is_video:
        allowed, max_mb = VIDEO_TYPES, 100
    elif field.startswith("logo_"):
        allowed, max_mb = LOGO_TYPES, 10
    else:
        allowed, max_mb = IMAGE_TYPES, 10

    _, file_url = await save_upload(file, "settings", allowed, max_mb=max_mb, name_prefix=field)

    try:
        current = _read_settings()
        old_url = current.get(field, "")
        if old_url and old_url.startswith("/uploads/settings/"):
            old_path = Path(app_settings.UPLOAD_DIR) / "settings" / Path(old_url).name
            if old_path.exists():
                old_path.unlink()

        current[field] = file_url
        _write_settings(current)

        return {"field": field, "url": file_url}
    except Exception as e:
        logger.exception("Settings upload failed for field=%s", field)
        raise HTTPException(500, f"Upload failed: {e}")


@router.post("/reset-all-data")
async def reset_all_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN)),
):
    """Wipe all products, orders, and statistics. Categories, brands, banners, users stay."""
    from app.core.cache import cache_delete_pattern

    await db.execute(text("DELETE FROM stock_logs"))
    await db.execute(text("DELETE FROM cart_items"))
    await db.execute(text("DELETE FROM carts"))
    await db.execute(text("DELETE FROM crm_activities"))
    await db.execute(text("DELETE FROM crm_leads"))
    await db.execute(text("DELETE FROM reviews"))
    await db.execute(text("DELETE FROM product_questions"))
    await db.execute(text("DELETE FROM favorites"))
    await db.execute(text("DELETE FROM notifications"))
    await db.execute(text("DELETE FROM audit_logs"))
    await db.execute(text("DELETE FROM payments"))
    await db.execute(text("DELETE FROM order_items"))
    await db.execute(text("DELETE FROM orders"))
    await db.execute(text("DELETE FROM product_images"))
    await db.execute(text("DELETE FROM product_variants"))
    await db.execute(text("DELETE FROM products"))
    await db.execute(text("DELETE FROM promotions"))
    await db.execute(text(
        "UPDATE customer_profiles SET total_spent = 0, order_count = 0, "
        "average_order = 0, crm_status = 'new'"
    ))
    await db.flush()

    await cache_delete_pattern("products:*")
    await cache_delete_pattern("categories:*")
    await cache_delete_pattern("brands:*")
    await cache_delete_pattern("banners:*")

    return {"message": "Barcha mahsulotlar, buyurtmalar va statistikalar tozalandi"}
