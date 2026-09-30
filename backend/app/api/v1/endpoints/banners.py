import os
import uuid as uuid_mod
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db, RoleChecker
from app.core.cache import cache_get, cache_set, cache_delete_pattern
from app.core.config import settings
from app.utils.uploads import IMAGE_TYPES, save_upload
from app.models.content import Banner
from app.models.user import User, UserRole
from app.schemas.content import BannerCreate, BannerResponse

router = APIRouter(prefix="/banners", tags=["Banners"])


@router.get("", response_model=list[BannerResponse])
async def list_banners(db: Annotated[AsyncSession, Depends(get_db)], position: str | None = None):
    cache_key = f"banners:{position or 'all'}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    query = select(Banner).where(Banner.is_active == True).order_by(Banner.sort_order)
    if position:
        query = query.where(Banner.position == position)
    result = await db.execute(query)
    banners = list(result.scalars().all())
    serialized = [BannerResponse.model_validate(b).model_dump(mode="json") for b in banners]
    await cache_set(cache_key, serialized, ttl=300)
    return serialized


@router.get("/all", response_model=list[BannerResponse])
async def list_all_banners(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Banner).order_by(Banner.sort_order))
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=BannerResponse)
async def create_banner(
    data: BannerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    banner = Banner(**data.model_dump())
    db.add(banner)
    await db.flush()
    await db.refresh(banner)
    await cache_delete_pattern("banners:*")
    return banner


@router.post("/upload-image")
async def upload_banner_image(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
    file: UploadFile = File(...),
):
    _, url = await save_upload(file, "banners", IMAGE_TYPES, max_mb=10)
    return {"url": url}


@router.put("/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: UUID,
    data: BannerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    for key, value in data.model_dump().items():
        setattr(banner, key, value)
    await db.flush()
    await db.refresh(banner)
    await cache_delete_pattern("banners:*")
    return banner


@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    await db.delete(banner)
    await db.flush()
    await cache_delete_pattern("banners:*")
    return {"message": "Banner deleted"}
