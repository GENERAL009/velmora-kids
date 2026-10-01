"""Add map coordinates to customer addresses

Revision ID: 007_address_coords
Revises: 3100a10fe50a
Create Date: 2026-10-01 12:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007_address_coords"
down_revision: Union[str, None] = "3100a10fe50a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customer_addresses", sa.Column("latitude", sa.Numeric(precision=10, scale=8), nullable=True))
    op.add_column("customer_addresses", sa.Column("longitude", sa.Numeric(precision=11, scale=8), nullable=True))


def downgrade() -> None:
    op.drop_column("customer_addresses", "longitude")
    op.drop_column("customer_addresses", "latitude")
