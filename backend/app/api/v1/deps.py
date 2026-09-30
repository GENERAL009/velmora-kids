import uuid
from typing import Annotated, Sequence

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db  # noqa: F401  (single shared dependency)
from app.core.security import verify_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

STAFF_ROLES = (UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER, UserRole.CALL_CENTER)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Decode the JWT and return the corresponding User record."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = verify_token(token)
        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id_str is None or token_type != "access":
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the authenticated user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


async def get_optional_user(
    token: Annotated[str | None, Depends(optional_oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Return the authenticated active user, or None for anonymous/invalid tokens."""
    if not token:
        return None
    try:
        payload = verify_token(token)
        if payload.get("type") != "access" or not payload.get("sub"):
            return None
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, ValueError):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


def client_ip(request) -> str:
    """Real client IP behind nginx (X-Real-IP is set by our nginx config)."""
    return (
        request.headers.get("x-real-ip")
        or (request.headers.get("x-forwarded-for", "").split(",")[0].strip())
        or (request.client.host if request.client else "unknown")
    )


class RoleChecker:
    """Dependency factory that verifies user has one of the allowed roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR))])
        async def admin_endpoint(): ...
    """

    def __init__(self, *allowed_roles: UserRole) -> None:
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user


def require_role(*roles: UserRole):
    """Convenience wrapper that returns a RoleChecker dependency.

    Usage:
        @router.get("/sellers", dependencies=[Depends(require_role(UserRole.SELLER, UserRole.DIRECTOR))])
        async def sellers_endpoint(): ...
    """
    checker = RoleChecker(*roles)
    return Depends(checker)
