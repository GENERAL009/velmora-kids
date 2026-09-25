from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.crm import CustomerProfile
from app.models.order import Order
from app.schemas.user import UserResponse, PaginatedUsers
from app.schemas.order import OrderResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedUsers)
async def list_customers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER, UserRole.SELLER)),
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = select(User).where(User.role == UserRole.CUSTOMER)
    if search:
        query = query.where(
            User.first_name.ilike(f"%{search}%") | User.last_name.ilike(f"%{search}%") | User.phone.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    import math
    return {"items": list(result.scalars().all()), "total": total, "page": page, "pages": math.ceil(total / page_size) if total > 0 else 1}


@router.get("/{customer_id}", response_model=UserResponse)
async def get_customer(
    customer_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER, UserRole.SELLER)),
):
    result = await db.execute(
        select(User).where(User.id == customer_id, User.role == UserRole.CUSTOMER)
        .options(selectinload(User.customer_profile), selectinload(User.addresses))
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/{customer_id}/orders", response_model=list[OrderResponse])
async def customer_orders(
    customer_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER, UserRole.SELLER)),
):
    result = await db.execute(
        select(Order).where(Order.customer_id == customer_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().unique().all())
