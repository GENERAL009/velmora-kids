"""Customer self-service: profile summary, password change, saved addresses."""
import uuid
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user, get_db
from app.core.ratelimit import rate_limit
from app.core.security import hash_password, verify_password
from app.models.content import Favorite
from app.models.crm import CustomerAddress
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.user import User

router = APIRouter(prefix="/account", tags=["Account"])

MAX_ADDRESSES = 10


# ─── Schemas ────────────────────────────────────────────────────────────────

class AccountSummary(BaseModel):
    orders_count: int
    active_orders_count: int
    total_spent: float
    favorites_count: int
    addresses_count: int


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class AddressIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=3, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = Field(None, min_length=3, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    is_default: Optional[bool] = None


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    city: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool


# ─── Summary ────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=AccountSummary)
async def account_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    orders_count = (await db.execute(
        select(func.count()).select_from(Order).where(Order.customer_id == user.id)
    )).scalar() or 0
    active = (await db.execute(
        select(func.count()).select_from(Order).where(
            Order.customer_id == user.id,
            Order.status.notin_([OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED]),
        )
    )).scalar() or 0
    spent = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.customer_id == user.id,
            Order.payment_status == PaymentStatus.PAID,
            Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.RETURNED]),
        )
    )).scalar() or 0
    favorites = (await db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.user_id == user.id)
    )).scalar() or 0
    addresses = (await db.execute(
        select(func.count()).select_from(CustomerAddress).where(CustomerAddress.user_id == user.id)
    )).scalar() or 0
    return AccountSummary(
        orders_count=orders_count,
        active_orders_count=active,
        total_spent=float(spent),
        favorites_count=favorites,
        addresses_count=addresses,
    )


# ─── Password ───────────────────────────────────────────────────────────────

@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    await rate_limit(request, "change-password", limit=5, window=300)
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="wrong_current_password")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="same_password")
    user.hashed_password = hash_password(body.new_password)
    await db.flush()


# ─── Addresses ──────────────────────────────────────────────────────────────

def _coord(v: Optional[float]) -> Optional[Decimal]:
    return Decimal(str(round(v, 8))) if v is not None else None


async def _get_own_address(db: AsyncSession, user: User, address_id: uuid.UUID) -> CustomerAddress:
    addr = (await db.execute(
        select(CustomerAddress).where(CustomerAddress.id == address_id, CustomerAddress.user_id == user.id)
    )).scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    return addr


async def _clear_default(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(CustomerAddress).where(CustomerAddress.user_id == user.id).values(is_default=False)
    )


async def _list(db: AsyncSession, user: User) -> list[CustomerAddress]:
    result = await db.execute(
        select(CustomerAddress)
        .where(CustomerAddress.user_id == user.id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.label)
    )
    return list(result.scalars().all())


@router.get("/addresses", response_model=list[AddressOut])
async def list_addresses(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    return await _list(db, user)


@router.post("/addresses", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def create_address(
    body: AddressIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    existing = await _list(db, user)
    if len(existing) >= MAX_ADDRESSES:
        raise HTTPException(status_code=400, detail="too_many_addresses")
    make_default = body.is_default or not existing
    if make_default:
        await _clear_default(db, user)
    addr = CustomerAddress(
        user_id=user.id,
        label=body.label.strip(),
        city=body.city.strip(),
        address=body.address.strip(),
        latitude=_coord(body.latitude),
        longitude=_coord(body.longitude),
        is_default=make_default,
    )
    db.add(addr)
    await db.flush()
    await db.refresh(addr)
    return addr


@router.patch("/addresses/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: uuid.UUID,
    body: AddressUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    addr = await _get_own_address(db, user, address_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("is_default"):
        await _clear_default(db, user)
    for field in ("label", "city", "address"):
        if data.get(field) is not None:
            setattr(addr, field, data[field].strip())
    if "latitude" in data or "longitude" in data:
        addr.latitude = _coord(data.get("latitude"))
        addr.longitude = _coord(data.get("longitude"))
    if data.get("is_default"):
        addr.is_default = True
    await db.flush()
    await db.refresh(addr)
    return addr


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_active_user)],
):
    addr = await _get_own_address(db, user, address_id)
    was_default = addr.is_default
    await db.delete(addr)
    await db.flush()
    if was_default:
        remaining = await _list(db, user)
        if remaining:
            remaining[0].is_default = True
            await db.flush()
