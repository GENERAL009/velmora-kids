from typing import Annotated
from uuid import UUID
from datetime import datetime, timezone
from fastapi import Request, APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.ratelimit import rate_limit
from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.content import ProductQuestion
from app.schemas.content import ProductQuestionCreate, ProductQuestionDetailResponse
from pydantic import BaseModel

router = APIRouter(tags=["Product Questions"])


class AnswerInput(BaseModel):
    answer: str


@router.get("/products/{product_id}/questions", response_model=list[ProductQuestionDetailResponse])
async def list_questions(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ProductQuestion).where(
            ProductQuestion.product_id == product_id, ProductQuestion.is_public == True
        ).order_by(ProductQuestion.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/questions", status_code=201, response_model=ProductQuestionDetailResponse)
async def ask_question(
    data: ProductQuestionCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await rate_limit(request, "question", limit=5, window=300)
    question = ProductQuestion(
        product_id=data.product_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        question=data.question,
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


@router.patch("/questions/{question_id}/answer", response_model=ProductQuestionDetailResponse)
async def answer_question(
    question_id: UUID,
    data: AnswerInput,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.CALL_CENTER)),
):
    result = await db.execute(select(ProductQuestion).where(ProductQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.answer = data.answer
    q.answered_by = current_user.id
    q.answered_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(q)
    return q
