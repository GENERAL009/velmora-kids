from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import async_engine


async def ensure_superadmin():
    from sqlalchemy import select
    from sqlalchemy.exc import IntegrityError
    from app.core.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.core.security import hash_password

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
            print(f"Super admin created: {settings.ADMIN_EMAIL}")
    except (IntegrityError, Exception):
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.telegram_service import verify_bot_and_setup_webhook
    await ensure_superadmin()
    await verify_bot_and_setup_webhook()
    yield
    await async_engine.dispose()


app = FastAPI(
    title="Velmora Kids API",
    description="Premium Kids E-commerce + POS + CRM platform API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
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
