from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.audit import log_audit
from app.api.v1.deps import get_db, RoleChecker
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN)),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN)),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email, phone=data.phone,
        hashed_password=hash_password(data.password),
        first_name=data.first_name, last_name=data.last_name,
        role=UserRole(data.role) if data.role else UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    allowed_fields = {"first_name", "last_name", "email", "phone", "is_active", "is_verified", "avatar"}
    changes: dict = {}
    for field, value in data.items():
        if field == "password":
            if not isinstance(value, str) or len(value) < 8:
                raise HTTPException(status_code=400, detail="Parol kamida 8 ta belgidan iborat bo'lishi kerak")
            user.hashed_password = hash_password(value)
            changes["password"] = "***"
        elif field == "role":
            try:
                new_role = UserRole(value)
            except ValueError:
                raise HTTPException(status_code=400, detail="Noto'g'ri rol")
            if user.id == current_user.id and new_role != UserRole.SUPER_ADMIN:
                raise HTTPException(status_code=400, detail="O'zingizning super admin rolingizni o'zgartira olmaysiz")
            changes["role"] = new_role.value
            user.role = new_role
        elif field in allowed_fields:
            if field == "is_active" and user.id == current_user.id and not value:
                raise HTTPException(status_code=400, detail="O'zingizni bloklay olmaysiz")
            setattr(user, field, value)
            changes[field] = value
    await log_audit(db, current_user.id, "user_updated", "user", str(user.id), new_value=changes)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.flush()
    return {"message": "User deactivated"}
