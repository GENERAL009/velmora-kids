from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.inventory import Warehouse
from app.schemas.inventory import WarehouseCreate, WarehouseResponse

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


@router.get("", response_model=list[WarehouseResponse])
async def list_warehouses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Warehouse).where(Warehouse.is_active == True))
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WarehouseResponse)
async def create_warehouse(
    data: WarehouseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    warehouse = Warehouse(**data.model_dump())
    db.add(warehouse)
    await db.flush()
    await db.refresh(warehouse)
    return warehouse
