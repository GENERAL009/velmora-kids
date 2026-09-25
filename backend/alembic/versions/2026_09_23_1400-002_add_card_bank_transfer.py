"""add card_transfer and bank_transfer payment methods

Revision ID: 002
Revises: f2faea03d7d2
Create Date: 2026-09-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "f2faea03d7d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'card_transfer'")
    op.execute("ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'bank_transfer'")
    op.execute("ALTER TYPE payment_provider_enum ADD VALUE IF NOT EXISTS 'card_transfer'")
    op.execute("ALTER TYPE payment_provider_enum ADD VALUE IF NOT EXISTS 'bank_transfer'")


def downgrade() -> None:
    pass
