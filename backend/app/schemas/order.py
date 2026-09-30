from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class OrderItemCreate(BaseModel):
    product_variant_id: UUID
    quantity: int = Field(ge=1, le=100)


class OrderCreate(BaseModel):
    customer_first_name: str = Field(min_length=1, max_length=100)
    customer_last_name: str = Field(min_length=1, max_length=100)
    customer_phone: str = Field(min_length=5, max_length=20)
    delivery_method: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_lat: Optional[float] = Field(None, ge=-90, le=90)
    delivery_lon: Optional[float] = Field(None, ge=-180, le=180)
    payment_method: str
    promo_code: Optional[str] = Field(None, max_length=50)
    comment: Optional[str] = Field(None, max_length=2000)
    items: list[OrderItemCreate] = Field(min_length=1, max_length=100)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_name: str
    product_sku: str
    size_name: Optional[str] = None
    color_name: str
    quantity: int
    unit_price: float
    discount_amount: float
    total: float


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    customer_id: UUID
    status: str
    subtotal: float
    discount_amount: float
    delivery_fee: float
    total: float
    payment_method: str
    payment_status: str
    delivery_method: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    customer_first_name: str
    customer_last_name: str
    customer_phone: str
    comment: Optional[str] = None
    notes: Optional[str] = None
    items: list[OrderItemResponse]
    created_at: datetime
    paid_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    seller_id: Optional[UUID] = None
    call_center_id: Optional[UUID] = None


class PaginatedOrders(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    pages: int


class OrderFilter(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20
