"""Add delivery lat/lon to orders

Revision ID: 3100a10fe50a
Revises: 006_simplify_inventory
Create Date: 2026-09-30 18:42:20.809611+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '3100a10fe50a'
down_revision: Union[str, None] = '006_simplify_inventory'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('delivery_lat', sa.Numeric(precision=10, scale=8), nullable=True))
    op.add_column('orders', sa.Column('delivery_lon', sa.Numeric(precision=11, scale=8), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'delivery_lon')
    op.drop_column('orders', 'delivery_lat')
