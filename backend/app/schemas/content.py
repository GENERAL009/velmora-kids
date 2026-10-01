from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import computed_field, BaseModel, ConfigDict, Field
from typing import Optional


class CartItemCreate(BaseModel):
    product_variant_id: UUID
    quantity: int = 1


class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_variant_id: UUID
    product_name: str
    product_image: Optional[str] = None
    size_name: Optional[str] = None
    color_name: str
    quantity: int
    unit_price: float
    total: float


class CartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[CartItemResponse]
    subtotal: float
    item_count: int


class ReviewCreate(BaseModel):
    product_id: UUID
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    is_approved: bool


class ProductQuestionCreate(BaseModel):
    product_id: UUID
    question: str
    customer_name: str
    customer_phone: Optional[str] = None


class ProductQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question: str
    answer: Optional[str] = None
    customer_name: str
    is_public: bool
    created_at: datetime


class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image: str
    mobile_image: Optional[str] = None
    link: Optional[str] = None
    button_text: Optional[str] = None
    position: str
    sort_order: int = 0
    is_active: bool = True


class BannerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    subtitle: Optional[str] = None
    image: str
    mobile_image: Optional[str] = None
    link: Optional[str] = None
    button_text: Optional[str] = None
    position: str
    sort_order: int
    is_active: bool
    created_at: datetime


class PromotionCreate(BaseModel):
    name: str
    code: Optional[str] = None
    discount_type: str
    discount_value: Decimal
    min_order_amount: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    applies_to: str
    product_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    usage_limit: Optional[int] = None
    start_date: datetime
    end_date: datetime


class PromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: Optional[str] = None
    discount_type: str
    discount_value: Decimal
    min_order_amount: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    applies_to: str
    product_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    usage_limit: Optional[int] = None
    used_count: int
    start_date: datetime
    end_date: datetime
    is_active: bool
    created_at: datetime


class UserBriefForContent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str


class ProductImageBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_path: str
    is_primary: bool = False
    sort_order: int = 0


class ProductBriefForContent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    slug: str
    selling_price: float
    discount_price: Optional[float] = None
    status: Optional[str] = None
    images: list[ProductImageBrief] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def image(self) -> Optional[str]:
        """Primary image (or the first one) for list views like favorites."""
        if not self.images:
            return None
        primary = next((i for i in self.images if i.is_primary), None)
        return (primary or sorted(self.images, key=lambda i: i.sort_order)[0]).file_path


class FavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    product_id: UUID
    product: Optional[ProductBriefForContent] = None
    created_at: datetime


class ReviewWithUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    is_approved: bool
    is_visible: bool
    user: Optional[UserBriefForContent] = None
    created_at: datetime


class ProductQuestionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    customer_name: str
    customer_phone: Optional[str] = None
    question: str
    answer: Optional[str] = None
    answered_at: Optional[datetime] = None
    is_public: bool
    created_at: datetime


class CartItemDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_variant_id: UUID
    quantity: int


class CartDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    items: list[CartItemDetailResponse] = []
    created_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    provider: str
    transaction_id: Optional[str] = None
    amount: float
    status: str
    created_at: datetime


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime
