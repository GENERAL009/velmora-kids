"""add suspicious status

Revision ID: 004_add_suspicious_status
Revises: 003_payment_receipt
Create Date: 2026-09-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_add_suspicious_status"
down_revision: Union[str, None] = "003_payment_receipt"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL requires special handling to alter an enum type
    op.execute("ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'suspicious'")


def downgrade() -> None:
    # Removing enum values is not supported natively in PG without complex workarounds,
    # so we just pass for downgrade.
    pass
