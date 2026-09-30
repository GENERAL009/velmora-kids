import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.product import Gender, ProductStatus


# ──── Category ────


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=200)
    name_uz: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    slug: str = Field(..., max_length=250)
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    name_uz: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=250)
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CategoryTree(CategoryResponse):
    children: list["CategoryTree"] = []

    model_config = {"from_attributes": True}


# ──── Brand ────


class BrandCreate(BaseModel):
    name: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=250)
    logo: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=250)
    logo: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BrandResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    logo: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ──── Collection ────


class CollectionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    name_uz: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    slug: str = Field(..., max_length=250)
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    name_uz: Optional[str] = Field(None, max_length=200)
    name_ru: Optional[str] = Field(None, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=250)
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ──── Color ────


class ColorCreate(BaseModel):
    name: str = Field(..., max_length=100)
    name_uz: Optional[str] = Field(None, max_length=100)
    name_ru: Optional[str] = Field(None, max_length=100)
    name_en: Optional[str] = Field(None, max_length=100)
    hex_code: str = Field(..., max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active: bool = True


class ColorResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    hex_code: str
    is_active: bool

    model_config = {"from_attributes": True}


# ──── ProductImage ────


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    file_path: str
    alt_text: Optional[str] = None
    sort_order: int
    is_primary: bool

    model_config = {"from_attributes": True}


# ──── ProductVariant ────


class ProductVariantCreate(BaseModel):
    color_id: uuid.UUID
    sku: str = Field(..., max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    additional_price: Decimal = Decimal("0.00")
    is_active: bool = True
    initial_stock: int = Field(0, ge=0, le=100000)


class ProductVariantUpdate(BaseModel):
    color_id: Optional[uuid.UUID] = None
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    additional_price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    color_id: uuid.UUID
    sku: str
    barcode: Optional[str] = None
    additional_price: Decimal
    is_active: bool
    color: Optional[ColorResponse] = None

    model_config = {"from_attributes": True}


# ──── Product ────


class ProductCreate(BaseModel):
    name: str = Field(..., max_length=300)
    initial_stock: int = Field(0, ge=0, le=100000)
    name_uz: Optional[str] = Field(None, max_length=300)
    name_ru: Optional[str] = Field(None, max_length=300)
    name_en: Optional[str] = Field(None, max_length=300)
    slug: str = Field(..., max_length=350)
    sku: str = Field(..., max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: uuid.UUID
    category_id: uuid.UUID
    collection_id: Optional[uuid.UUID] = None
    gender: Gender = Gender.BOTH
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_weight_kg: Optional[Decimal] = None
    product_weight_kg: Optional[Decimal] = None
    dimensions: Optional[str] = Field(None, max_length=100)
    wheel_type: Optional[str] = Field(None, max_length=100)
    wheel_count: Optional[int] = None
    max_speed_kmh: Optional[int] = None
    battery_type: Optional[str] = Field(None, max_length=100)
    has_remote_control: bool = False
    has_lights: bool = False
    has_music: bool = False
    purchase_price: Decimal = Decimal("0.00")
    selling_price: Decimal = Decimal("0.00")
    discount_percent: int = 0
    discount_price: Optional[Decimal] = None
    seo_title: Optional[str] = Field(None, max_length=300)
    seo_description: Optional[str] = Field(None, max_length=500)
    status: ProductStatus = ProductStatus.DRAFT
    is_featured: bool = False
    is_bestseller: bool = False
    is_new: bool = True
    variants: list[ProductVariantCreate] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=300)
    name_uz: Optional[str] = Field(None, max_length=300)
    name_ru: Optional[str] = Field(None, max_length=300)
    name_en: Optional[str] = Field(None, max_length=300)
    slug: Optional[str] = Field(None, max_length=350)
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    collection_id: Optional[uuid.UUID] = None
    gender: Optional[Gender] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_weight_kg: Optional[Decimal] = None
    product_weight_kg: Optional[Decimal] = None
    dimensions: Optional[str] = Field(None, max_length=100)
    wheel_type: Optional[str] = Field(None, max_length=100)
    wheel_count: Optional[int] = None
    max_speed_kmh: Optional[int] = None
    battery_type: Optional[str] = Field(None, max_length=100)
    has_remote_control: Optional[bool] = None
    has_lights: Optional[bool] = None
    has_music: Optional[bool] = None
    purchase_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    discount_percent: Optional[int] = None
    discount_price: Optional[Decimal] = None
    seo_title: Optional[str] = Field(None, max_length=300)
    seo_description: Optional[str] = Field(None, max_length=500)
    status: Optional[ProductStatus] = None
    is_featured: Optional[bool] = None
    is_bestseller: Optional[bool] = None
    is_new: Optional[bool] = None


class ProductPublicResponse(BaseModel):
    """Storefront view — no purchase (cost) price."""
    id: uuid.UUID
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    slug: str
    sku: str
    barcode: Optional[str] = None
    description: Optional[str] = None
    description_uz: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    short_description: Optional[str] = None
    brand_id: uuid.UUID
    category_id: uuid.UUID
    collection_id: Optional[uuid.UUID] = None
    gender: Gender
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_weight_kg: Optional[Decimal] = None
    product_weight_kg: Optional[Decimal] = None
    dimensions: Optional[str] = None
    wheel_type: Optional[str] = None
    wheel_count: Optional[int] = None
    max_speed_kmh: Optional[int] = None
    battery_type: Optional[str] = None
    has_remote_control: bool = False
    has_lights: bool = False
    has_music: bool = False
    selling_price: Decimal
    discount_percent: int
    discount_price: Optional[Decimal] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    status: ProductStatus
    is_featured: bool
    is_bestseller: bool
    is_new: bool
    views: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    brand: Optional[BrandResponse] = None
    category: Optional[CategoryResponse] = None
    collection: Optional[CollectionResponse] = None
    variants: list[ProductVariantResponse] = []
    images: list[ProductImageResponse] = []

    model_config = {"from_attributes": True}


class ProductResponse(ProductPublicResponse):
    """Admin view — includes purchase price."""
    purchase_price: Decimal


class ProductList(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    sku: str
    selling_price: Decimal
    discount_percent: int
    discount_price: Optional[Decimal] = None
    status: ProductStatus
    is_featured: bool
    is_bestseller: bool
    is_new: bool
    views: int = 0
    gender: Gender
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    brand: Optional[BrandResponse] = None
    category: Optional[CategoryResponse] = None
    images: list[ProductImageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    items: list[ProductList]
    total: int
    page: int
    page_size: Optional[int] = None
    pages: int
