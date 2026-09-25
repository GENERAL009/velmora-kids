from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.services import inventory_service
from app.schemas.inventory import (
    StockReceiveCreate, PaginatedInventory, InventoryResponse,
    InventoryMovementResponse, PurchaseResponse,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=PaginatedInventory)
async def list_inventory(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
    warehouse_id: UUID | None = None,
    low_stock: bool | None = None,
    out_of_stock: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    class Filters:
        pass
    f = Filters()
    f.warehouse_id = warehouse_id
    f.low_stock = low_stock
    f.out_of_stock = out_of_stock
    f.page = page
    f.page_size = page_size
    return await inventory_service.get_inventory(db, f)


@router.get("/low-stock", response_model=list[InventoryResponse])
async def low_stock_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
    threshold: int = 5,
):
    return await inventory_service.get_low_stock(db, threshold)


@router.get("/out-of-stock", response_model=list[InventoryResponse])
async def out_of_stock_items(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.SELLER)),
):
    return await inventory_service.get_out_of_stock(db)


@router.get("/movements/{inventory_id}", response_model=list[InventoryMovementResponse])
async def get_movements(
    inventory_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await inventory_service.get_movements(db, inventory_id)


@router.post("/receive", response_model=PurchaseResponse)
async def receive_stock(
    data: StockReceiveCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    return await inventory_service.receive_stock(db, data, current_user.id)
