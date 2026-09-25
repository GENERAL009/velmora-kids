from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.inventory import Supplier, Purchase
from app.schemas.inventory import SupplierCreate, SupplierResponse, SupplierDetailResponse, PurchaseResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Supplier).where(Supplier.is_active == True).order_by(Supplier.name))
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SupplierResponse)
async def create_supplier(
    data: SupplierCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierDetailResponse)
async def get_supplier(
    supplier_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(
        select(Supplier).where(Supplier.id == supplier_id).options(selectinload(Supplier.purchases))
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.get("/{supplier_id}/purchases", response_model=list[PurchaseResponse])
async def supplier_purchases(
    supplier_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(
        select(Purchase).where(Purchase.supplier_id == supplier_id)
        .options(selectinload(Purchase.items))
        .order_by(Purchase.created_at.desc())
    )
    return list(result.scalars().unique().all())
