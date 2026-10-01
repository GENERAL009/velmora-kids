from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user, get_db
from app.core.ratelimit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.user import User, UserRole
from app.schemas.user import RefreshTokenRequest, Token, UserCreate, UserLogin, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
async def register(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    await rate_limit(request, "register", limit=10, window=60)
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Check if phone already exists (when provided)
    if user_in.phone:
        result = await db.execute(select(User).where(User.phone == user_in.phone))
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists",
            )

    user = User(
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=hash_password(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role=UserRole.CUSTOMER,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    if user_in.city and user_in.address:
        from app.models.crm import CustomerAddress
        from decimal import Decimal
        has_coords = user_in.latitude is not None and user_in.longitude is not None
        addr = CustomerAddress(
            user_id=user.id,
            label="Uy",
            city=user_in.city,
            address=user_in.address,
            latitude=Decimal(str(round(user_in.latitude, 8))) if has_coords else None,
            longitude=Decimal(str(round(user_in.longitude, 8))) if has_coords else None,
            is_default=True,
        )
        db.add(addr)
        await db.flush()

    await db.refresh(user)

    token_data = {"sub": str(user.id)}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate and receive access + refresh tokens",
)
async def login(
    request: Request,
    credentials: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    await rate_limit(request, "login", limit=10, window=60)
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Update last login timestamp
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    token_data = {"sub": str(user.id)}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Exchange a refresh token for a new access + refresh token pair",
)
async def refresh_token(
    request: Request,
    token: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    await rate_limit(request, "refresh", limit=10, window=60)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = verify_token(token.refresh_token)
        if payload.get("type") != "refresh":
            raise credentials_exception
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    token_data = {"sub": str(user.id)}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current authenticated user's profile",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update the current user's profile",
)
async def update_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    update_data = user_in.model_dump(exclude_unset=True)

    if "phone" in update_data and update_data["phone"] is not None:
        result = await db.execute(
            select(User).where(
                User.phone == update_data["phone"],
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this phone number already exists",
            )

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset email",
)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await rate_limit(request, "forgot", limit=10, window=60)
    return {"message": "If an account with this email exists, a reset link has been sent"}
