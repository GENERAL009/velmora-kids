"""Safe file upload helpers.

Every upload goes through `save_upload`, which:
  * accepts only whitelisted MIME types,
  * picks the file extension from the MIME type (never from the user's filename),
  * enforces a size limit,
  * checks the file's magic bytes so e.g. an HTML file renamed to .jpg is rejected.
"""
import io
import os
import re
import uuid

from fastapi import HTTPException, UploadFile

from app.core.config import settings

IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
}
RECEIPT_TYPES: dict[str, str] = {
    **IMAGE_TYPES,
    "image/heic": ".heic",
    "image/heif": ".heic",
}
ICON_TYPES: dict[str, str] = {
    **IMAGE_TYPES,
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
}
LOGO_TYPES: dict[str, str] = {
    **ICON_TYPES,
    "image/svg+xml": ".svg",
}
VIDEO_TYPES: dict[str, str] = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

MB = 1024 * 1024


_SVG_DANGEROUS = re.compile(rb"<script|javascript:|<foreignobject|\son[a-z]+\s*=", re.IGNORECASE)


def _sniff(content: bytes) -> str | None:
    """Return a coarse file kind from magic bytes."""
    head = content[:32]
    stripped = content.lstrip()[:512].lower()
    if (stripped.startswith(b"<?xml") or stripped.startswith(b"<svg")) and b"<svg" in content[:4096].lower():
        return "svg-unsafe" if _SVG_DANGEROUS.search(content) else "svg"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:4] == b"\x00\x00\x01\x00":
        return "ico"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in (b"avif", b"avis"):
            return "avif"
        if brand in (b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1", b"heim", b"heis"):
            return "heic"
        return "mp4"
    return None


_EXPECTED_KIND = {
    ".jpg": {"jpeg"},
    ".png": {"png"},
    ".webp": {"webp"},
    ".gif": {"gif"},
    ".avif": {"avif", "heic"},  # some encoders write a mif1 brand
    ".heic": {"heic", "avif"},
    ".ico": {"ico", "png"},
    ".mp4": {"mp4"},
    ".webm": {"webm"},
    ".svg": {"svg"},
}


async def save_upload(
    file: UploadFile,
    subdir: str,
    allowed: dict[str, str],
    max_mb: int = 10,
    name_prefix: str | None = None,
) -> tuple[str, str]:
    """Validate and store an upload. Returns (absolute_path, public_url)."""
    content_type = (file.content_type or "").lower()
    ext = allowed.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail=f"Ruxsat etilmagan fayl turi: {content_type or 'unknown'}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fayl bo'sh")
    if len(content) > max_mb * MB:
        raise HTTPException(status_code=400, detail=f"Fayl juda katta (maksimum {max_mb} MB)")

    kind = _sniff(content)
    if kind not in _EXPECTED_KIND.get(ext, set()):
        raise HTTPException(status_code=400, detail="Fayl mazmuni turiga mos emas")

    # Deep check for common raster formats (catches truncated / polyglot files)
    if kind in ("jpeg", "png", "gif", "webp"):
        try:
            from PIL import Image

            with Image.open(io.BytesIO(content)) as img:
                img.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="Rasm fayli buzilgan yoki noto'g'ri")

    directory = os.path.join(settings.UPLOAD_DIR, subdir) if subdir else settings.UPLOAD_DIR
    os.makedirs(directory, exist_ok=True)
    prefix = f"{name_prefix}_" if name_prefix else ""
    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    path = os.path.join(directory, filename)
    with open(path, "wb") as f:
        f.write(content)

    url_dir = f"/uploads/{subdir.strip('/')}/" if subdir else "/uploads/"
    return path, f"{url_dir}{filename}"
