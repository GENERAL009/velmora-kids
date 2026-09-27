from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class StockItemColor(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    hex_code: str


class StockItemProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    sku: str
    selling_price: float = 0
    discount_price: Optional[float] = None


class StockItemVariant(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sku: str
    stock: int
    is_active: bool
    additional_price: float = 0
    product: Optional[StockItemProduct] = None
    color: Optional[StockItemColor] = None


class StockListResponse(BaseModel):
    items: list[StockItemVariant]
    total: int
    page: int
    pages: int


class StockAddRequest(BaseModel):
    variant_id: UUID
    quantity: int = Field(..., gt=0)
    note: Optional[str] = None


class StockAdjustRequest(BaseModel):
    variant_id: UUID
    new_quantity: int = Field(..., ge=0)
    note: Optional[str] = None


class StockLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_variant_id: UUID
    movement_type: str
    quantity: int
    stock_before: int
    stock_after: int
    note: Optional[str] = None
    created_at: datetime


class POSSaleItem(BaseModel):
    variant_id: UUID
    quantity: int = Field(..., gt=0)


class POSSaleRequest(BaseModel):
    items: list[POSSaleItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: str = "cash"
    note: Optional[str] = None


class POSSaleResponse(BaseModel):
    order_id: UUID
    order_number: str
    total: float
    items_count: int
