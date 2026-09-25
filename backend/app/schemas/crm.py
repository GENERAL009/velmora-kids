from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional


class CRMLeadCreate(BaseModel):
    customer_name: str
    customer_phone: str
    source: str
    message: Optional[str] = None
    product_id: Optional[UUID] = None
    priority: str = "medium"


class CRMLeadUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[UUID] = None
    notes: Optional[str] = None
    priority: Optional[str] = None


class CRMLeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_name: str
    customer_phone: str
    source: str
    message: Optional[str] = None
    status: str
    priority: str
    created_at: datetime


class CRMActivityCreate(BaseModel):
    lead_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    activity_type: str
    description: str


class CRMUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str
    last_name: str


class CRMLeadDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: Optional[UUID] = None
    customer_name: str
    customer_phone: str
    source: str
    message: Optional[str] = None
    status: str
    priority: str
    notes: Optional[str] = None
    assigned_to: Optional[UUID] = None
    product_id: Optional[UUID] = None
    customer: Optional[CRMUserBrief] = None
    assigned_user: Optional[CRMUserBrief] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class PaginatedLeads(BaseModel):
    items: list[CRMLeadDetailResponse]
    total: int
    page: int
    pages: int


class CRMActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    activity_type: str
    description: str
    created_at: datetime


class CRMActivityDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    activity_type: str
    description: str
    performer: Optional[CRMUserBrief] = None
    created_at: datetime


class CustomerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    total_spent: float
    order_count: int
    average_order: float
    crm_status: str
