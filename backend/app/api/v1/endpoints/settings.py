import json
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from app.api.v1.deps import RoleChecker
from app.models.user import User, UserRole
from app.core.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Site Settings"])

SETTINGS_FILE = Path(__file__).resolve().parents[4] / "data" / "site_settings.json"

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
    "footer_about": "Velmora Kids — премиальный магазин детской одежды в Узбекистане.",
    "meta_title": "Velmora Kids — Детская одежда премиум класса",
    "meta_description": "Интернет-магазин премиальной детской одежды. Доставка по всему Узбекистану.",
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
    return _read_settings()


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


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/x-icon", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
UPLOAD_FIELDS = {
    "hero_video_url", "hero_video_url_dark",
    "hero_video_poster", "hero_video_poster_dark",
    "hero_girls_image_light", "hero_girls_image_dark",
    "hero_boys_image_light", "hero_boys_image_dark",
    "logo_header", "logo_footer", "logo_favicon",
}
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10MB


@router.post("/upload")
async def upload_setting_file(
    field: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    if field not in UPLOAD_FIELDS:
        raise HTTPException(400, f"Invalid field: {field}. Allowed: {', '.join(sorted(UPLOAD_FIELDS))}")

    is_video = field in ("hero_video_url", "hero_video_url_dark")
    allowed = ALLOWED_VIDEO_TYPES if is_video else ALLOWED_IMAGE_TYPES
    max_size = MAX_VIDEO_SIZE if is_video else MAX_IMAGE_SIZE

    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(400, f"File too large. Max: {max_size // (1024*1024)}MB")

    ext = Path(file.filename).suffix.lower() if file.filename else (".mp4" if is_video else ".jpg")
    upload_dir = Path(app_settings.UPLOAD_DIR) / "settings"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{field}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    file_url = f"/uploads/settings/{filename}"

    current = _read_settings()
    old_url = current.get(field, "")
    if old_url and old_url.startswith("/uploads/settings/"):
        old_path = Path(app_settings.UPLOAD_DIR) / "settings" / Path(old_url).name
        if old_path.exists():
            old_path.unlink()

    current[field] = file_url
    _write_settings(current)

    return {"field": field, "url": file_url}
