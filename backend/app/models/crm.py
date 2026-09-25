import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
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


class CRMStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    WAITING = "waiting"
    PURCHASED = "purchased"
    REPEAT_CUSTOMER = "repeat_customer"
    LOST = "lost"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class LeadPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    order_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_order: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0, nullable=False
    )
    crm_status: Mapped[CRMStatus] = mapped_column(
        Enum(CRMStatus, name="crm_status_enum", create_constraint=True, values_callable=lambda x: [e.value for e in x]),
        default=CRMStatus.NEW,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="customer_profile", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<CustomerProfile user={self.user_id} status={self.crm_status.value}>"


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="addresses", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<CustomerAddress {self.label} ({self.city})>"


class CRMLead(Base):
    __tablename__ = "crm_leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status_enum", create_constraint=True, values_callable=lambda x: [e.value for e in x]),
        default=LeadStatus.NEW,
        nullable=False,
    )
    priority: Mapped[LeadPriority] = mapped_column(
        Enum(LeadPriority, name="lead_priority_enum", create_constraint=True, values_callable=lambda x: [e.value for e in x]),
        default=LeadPriority.MEDIUM,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[customer_id], lazy="selectin"
    )
    assigned_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[assigned_to], lazy="selectin"
    )
    product: Mapped["Product | None"] = relationship(  # noqa: F821
        "Product", lazy="selectin"
    )
    activities: Mapped[list["CRMActivity"]] = relationship(
        "CRMActivity",
        back_populates="lead",
        foreign_keys="CRMActivity.lead_id",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<CRMLead {self.customer_name} ({self.status.value})>"


class CRMActivity(Base):
    __tablename__ = "crm_activities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crm_leads.id", ondelete="CASCADE"),
        nullable=True,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    performed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lead: Mapped["CRMLead | None"] = relationship(
        "CRMLead",
        back_populates="activities",
        foreign_keys=[lead_id],
        lazy="selectin",
    )
    customer: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[customer_id], lazy="selectin"
    )
    performer: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[performed_by], lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<CRMActivity {self.activity_type}>"
