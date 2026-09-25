from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.content import Promotion
from app.schemas.content import PromotionCreate, PromotionResponse
from pydantic import BaseModel

router = APIRouter(prefix="/promotions", tags=["Promotions"])


class CouponValidation(BaseModel):
    code: str


@router.get("", response_model=list[PromotionResponse])
async def list_promotions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Promotion).order_by(Promotion.created_at.desc()))
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PromotionResponse)
async def create_promotion(
    data: PromotionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    promo = Promotion(**data.model_dump())
    db.add(promo)
    await db.flush()
    await db.refresh(promo)
    return promo


@router.post("/validate-coupon", response_model=PromotionResponse)
async def validate_coupon(
    data: CouponValidation,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Promotion).where(Promotion.code == data.code, Promotion.is_active == True))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    now = datetime.now(timezone.utc)
    if now < promo.start_date or now > promo.end_date:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if promo.usage_limit and promo.used_count >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    return promo
