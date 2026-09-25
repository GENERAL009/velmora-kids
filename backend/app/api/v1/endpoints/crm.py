from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_db, RoleChecker
from app.models.user import User, UserRole
from app.services import crm_service
from app.schemas.crm import (
    CRMLeadCreate, CRMLeadUpdate,
    CRMLeadResponse, CRMLeadDetailResponse, PaginatedLeads, CRMActivityDetailResponse,
)

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.get("/leads", response_model=PaginatedLeads)
async def list_leads(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
    lead_status: str | None = None,
    assigned_to: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    class Filters:
        pass
    f = Filters()
    f.status = lead_status
    f.assigned_to = assigned_to
    f.page = page
    f.page_size = page_size
    return await crm_service.get_leads(db, f)


@router.post("/leads", status_code=201, response_model=CRMLeadResponse)
async def create_lead(
    data: CRMLeadCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    return await crm_service.create_lead(db, data, current_user.id)


@router.patch("/leads/{lead_id}", response_model=CRMLeadResponse)
async def update_lead(
    lead_id: UUID,
    data: CRMLeadUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    return await crm_service.update_lead(db, lead_id, data)


@router.get("/customers/{customer_id}/timeline", response_model=list[CRMActivityDetailResponse])
async def customer_timeline(
    customer_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    return await crm_service.get_customer_timeline(db, customer_id)


@router.get("/dashboard")
async def crm_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.CALL_CENTER)),
):
    return await crm_service.get_dashboard_stats(db)
