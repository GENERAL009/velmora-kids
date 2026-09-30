import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import async_engine

logger = logging.getLogger("velmora")


async def ensure_superadmin():
    from sqlalchemy import select
    from sqlalchemy.exc import IntegrityError
    from app.core.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.core.security import hash_password

    if not settings.ADMIN_PASSWORD:
        return
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
            if result.scalar_one_or_none():
                return
            admin = User(
                email=settings.ADMIN_EMAIL,
                phone=settings.ADMIN_PHONE,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                first_name=settings.ADMIN_FIRST_NAME,
                last_name=settings.ADMIN_LAST_NAME,
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            await db.commit()
            logger.info("Super admin created: %s", settings.ADMIN_EMAIL)
    except IntegrityError:
        pass
    except Exception as e:  # noqa: BLE001
        logger.error("ensure_superadmin failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.telegram_service import verify_bot_and_setup_webhook
    if settings.uses_default_secret_key and not settings.DEBUG:
        logger.critical(
            "SECRET_KEY is the default value! JWT tokens can be forged. "
            "Set a long random SECRET_KEY in .env"
        )
    await ensure_superadmin()
    await verify_bot_and_setup_webhook()
    yield
    await async_engine.dispose()
    from app.core.cache import _redis as _redis_conn
    if _redis_conn:
        await _redis_conn.close()


app = FastAPI(
    title="Velmora Kids API",
    description="Kids vehicles e-commerce + POS + CRM platform API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


from fastapi.staticfiles import StaticFiles

# Mount uploads directory for static files
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": settings.PROJECT_NAME}
