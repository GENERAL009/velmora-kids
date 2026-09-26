from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Project
    PROJECT_NAME: str = "Velmora Kids"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/velmora_kids"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/velmora_kids"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth / JWT
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Payment: Payme
    PAYME_MERCHANT_ID: str = ""
    PAYME_SECRET_KEY: str = ""

    # Payment: Click
    CLICK_MERCHANT_ID: str = ""
    CLICK_SECRET_KEY: str = ""

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_GROUP_ID: str = ""
    TELEGRAM_ADMIN_IDS: list[int] = [1566454370, 1519994286]

    # Super Admin (auto-created on startup)
    ADMIN_EMAIL: str = "abdulloh@velmora.uz"
    ADMIN_PASSWORD: str = "a20662006b"
    ADMIN_FIRST_NAME: str = "Abdulloh"
    ADMIN_LAST_NAME: str = "Admin"
    ADMIN_PHONE: str = "+998900000001"

    # Upload
    UPLOAD_DIR: str = "uploads"

    # Backend public URL (for Telegram webhook, making absolute URLs for images)
    BACKEND_BASE_URL: str = ""

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    @property
    def async_database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL_SYNC:
            return self.DATABASE_URL_SYNC
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg2")


settings = Settings()
