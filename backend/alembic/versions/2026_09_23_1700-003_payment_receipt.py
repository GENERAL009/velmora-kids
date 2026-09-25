"""add payment receipt verification fields

Revision ID: 003_payment_receipt
Revises: 002_add_card_bank_transfer
Create Date: 2026-09-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_payment_receipt"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("receipt_image", sa.String(500), nullable=True))
    op.add_column("payments", sa.Column("receipt_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("verified_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("payments", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("telegram_message_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_payments_verified_by_users",
        "payments",
        "users",
        ["verified_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_payments_verified_by_users", "payments", type_="foreignkey")
    op.drop_column("payments", "telegram_message_id")
    op.drop_column("payments", "rejection_reason")
    op.drop_column("payments", "verified_at")
    op.drop_column("payments", "verified_by")
    op.drop_column("payments", "receipt_uploaded_at")
    op.drop_column("payments", "receipt_image")
