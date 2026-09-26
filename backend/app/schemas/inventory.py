from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional


class WarehouseCreate(BaseModel):
    name: str
    address: Optional[str] = None


class WarehouseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    address: Optional[str] = None
    is_active: bool
    created_at: datetime


class InventoryVariantInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    is_active: bool


class InventoryProductInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    sku: str


class InventoryColorInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    hex_code: str


class InventoryWarehouseInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class InventoryDetailVariant(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    is_active: bool
    product: Optional[InventoryProductInfo] = None
    color: Optional[InventoryColorInfo] = None


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_variant_id: UUID
    warehouse_id: UUID
    quantity: int
    reserved: int
    available: int
    product_variant: Optional[InventoryDetailVariant] = None
    warehouse: Optional[InventoryWarehouseInfo] = None


class PaginatedInventory(BaseModel):
    items: list[InventoryResponse]
    total: int
    page: int
    pages: int


class InventoryMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    movement_type: str
    quantity: int
    quantity_before: int
    quantity_after: int
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


class StockReceiveItem(BaseModel):
    product_variant_id: UUID
    quantity: int
    purchase_price: Decimal
    warehouse_id: UUID
    location_id: Optional[UUID] = None


class StockReceiveCreate(BaseModel):
    supplier_id: UUID
    items: list[StockReceiveItem]
    notes: Optional[str] = None


class InventoryFilter(BaseModel):
    warehouse_id: Optional[UUID] = None
    low_stock: Optional[bool] = None
    out_of_stock: Optional[bool] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20


class SupplierCreate(BaseModel):
    name: str
    company: Optional[str] = None
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    company: Optional[str] = None
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime


class PurchaseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_variant_id: UUID
    quantity: int
    purchase_price: Decimal
    total: Decimal


class PurchaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supplier_id: UUID
    purchase_number: str
    status: str
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    received_at: Optional[datetime] = None
    items: list[PurchaseItemResponse] = []


class SupplierDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    company: Optional[str] = None
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    purchases: list[PurchaseResponse] = []
