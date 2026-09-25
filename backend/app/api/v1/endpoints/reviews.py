from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.content import Review
from app.schemas.content import ReviewCreate, ReviewWithUserResponse, ReviewResponse

router = APIRouter(tags=["Reviews"])


@router.get("/reviews", response_model=list[ReviewWithUserResponse])
async def list_all_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_approved: bool | None = None,
):
    query = select(Review).options(
        selectinload(Review.user), selectinload(Review.product)
    ).order_by(Review.created_at.desc())
    if is_approved is not None:
        query = query.where(Review.is_approved == is_approved)
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/products/{product_id}/reviews", response_model=list[ReviewWithUserResponse])
async def list_reviews(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    query = select(Review).where(
        Review.product_id == product_id, Review.is_visible == True, Review.is_approved == True
    ).options(selectinload(Review.user)).order_by(Review.created_at.desc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/reviews", status_code=status.HTTP_201_CREATED, response_model=ReviewResponse)
async def create_review(
    data: ReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    review = Review(
        user_id=current_user.id,
        product_id=data.product_id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_approved=False,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


@router.patch("/reviews/{review_id}/approve", response_model=ReviewResponse)
async def approve_review(
    review_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = True
    await db.flush()
    return review


@router.patch("/reviews/{review_id}/reject", response_model=ReviewResponse)
async def reject_review(
    review_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = False
    review.is_visible = False
    await db.flush()
    return review
