import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Gender(str, enum.Enum):
    BOYS = "boys"
    GIRLS = "girls"
    BOTH = "both"


class ProductStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_uz: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    slug: Mapped[str] = mapped_column(String(250), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    parent: Mapped["Category | None"] = relationship(
        "Category", remote_side="Category.id", back_populates="children", lazy="selectin"
    )
    children: Mapped[list["Category"]] = relationship(
        "Category", back_populates="parent", lazy="selectin"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="category", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Category {self.name}>"


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(250), unique=True, index=True, nullable=False)
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="brand", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Brand {self.name}>"


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_uz: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(200), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    slug: Mapped[str] = mapped_column(String(250), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="collection", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Collection {self.name}>"


class Color(Base):
    __tablename__ = "colors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_uz: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hex_code: Mapped[str] = mapped_column(String(7), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant", back_populates="color", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Color {self.name} ({self.hex_code})>"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    name_uz: Mapped[str | None] = mapped_column(String(300), nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(300), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(300), nullable=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, index=True, nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    barcode: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_uz: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    brand_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("brands.id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    collection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True
    )

    gender: Mapped[Gender] = mapped_column(
        Enum(Gender, name="gender_enum", create_constraint=True, values_callable=lambda x: [e.value for e in x]),
        default=Gender.BOTH,
        nullable=False,
    )
    age_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    age_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Vehicle specs
    max_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 1), nullable=True)
    product_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 1), nullable=True)
    dimensions: Mapped[str | None] = mapped_column(String(100), nullable=True)
    wheel_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    wheel_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_speed_kmh: Mapped[int | None] = mapped_column(Integer, nullable=True)
    battery_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    has_remote_control: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_lights: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_music: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    purchase_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    selling_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    discount_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discount_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    seo_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status", create_constraint=True, values_callable=lambda x: [e.value for e in x]),
        default=ProductStatus.DRAFT,
        nullable=False,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    brand: Mapped["Brand"] = relationship("Brand", back_populates="products", lazy="selectin")
    category: Mapped["Category"] = relationship(
        "Category", back_populates="products", lazy="selectin"
    )
    collection: Mapped["Collection | None"] = relationship(
        "Collection", back_populates="products", lazy="selectin"
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant", back_populates="product", lazy="selectin", cascade="all, delete-orphan"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", lazy="selectin", cascade="all, delete-orphan",
        order_by="[ProductImage.is_primary.desc(), ProductImage.sort_order, ProductImage.id]",
    )
    reviews: Mapped[list["Review"]] = relationship(  # noqa: F821
        "Review", back_populates="product", lazy="noload"
    )
    questions: Mapped[list["ProductQuestion"]] = relationship(  # noqa: F821
        "ProductQuestion", back_populates="product", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Product {self.name} ({self.sku})>"


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    color_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("colors.id", ondelete="RESTRICT"), nullable=False
    )
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    barcode: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    additional_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0, nullable=False
    )
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship(
        "Product", back_populates="variants", lazy="selectin"
    )
    color: Mapped["Color"] = relationship("Color", back_populates="variants", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ProductVariant {self.sku}>"


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    product: Mapped["Product"] = relationship(
        "Product", back_populates="images", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ProductImage {self.file_path}>"
