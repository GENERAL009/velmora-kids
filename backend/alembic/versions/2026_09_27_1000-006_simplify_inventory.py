"""Simplify inventory: add stock to product_variants, create stock_logs,
drop old warehouse/supplier/inventory tables.

Revision ID: 006_simplify_inventory
Revises: 005_vehicles
Create Date: 2026-09-27 10:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "006_simplify_inventory"
down_revision: str = "005_vehicles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add stock column to product_variants
    op.add_column(
        "product_variants",
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
    )

    # Migrate existing inventory quantities to product_variants.stock
    op.execute("""
        UPDATE product_variants pv
        SET stock = COALESCE(
            (SELECT SUM(i.quantity) FROM inventory i WHERE i.product_variant_id = pv.id),
            0
        )
    """)

    # Create stock_movement_type_enum
    stock_movement_type = postgresql.ENUM(
        'incoming', 'sale', 'pos_sale', 'return', 'adjustment',
        name='stock_movement_type_enum',
        create_type=False,
    )
    stock_movement_type.create(op.get_bind(), checkfirst=True)

    # Create stock_logs table
    op.create_table(
        "stock_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_variant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "movement_type",
            postgresql.ENUM(
                'incoming', 'sale', 'pos_sale', 'return', 'adjustment',
                name='stock_movement_type_enum',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("stock_before", sa.Integer(), nullable=False),
        sa.Column("stock_after", sa.Integer(), nullable=False),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Drop old tables (order matters due to foreign keys)
    op.drop_table("inventory_movements")
    op.drop_table("purchase_items")
    op.drop_table("inventory")
    op.drop_table("purchases")
    op.drop_table("warehouse_locations")
    op.drop_table("warehouses")
    op.drop_table("suppliers")


def downgrade() -> None:
    # Recreating old tables is complex — this is a one-way migration
    op.drop_table("stock_logs")
    op.execute("DROP TYPE IF EXISTS stock_movement_type_enum")
    op.drop_column("product_variants", "stock")
