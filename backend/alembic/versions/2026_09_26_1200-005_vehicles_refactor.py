"""Refactor from clothing to kids vehicles

- Remove sizes table and size_id from product_variants
- Remove material from products, add vehicle specs
- Rename product_images.url to file_path
- Change gender enum: remove unisex, add both
- Make order_items.size_name nullable

Revision ID: 005_vehicles
Revises: 004_add_suspicious_status
Create Date: 2026-09-26 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005_vehicles"
down_revision: str = "004_add_suspicious_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add 'both' to gender enum — must commit before use in PostgreSQL
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE gender_enum ADD VALUE IF NOT EXISTS 'both'")

    # 2. Update existing UNISEX products to BOTH
    op.execute("UPDATE products SET gender = 'both' WHERE gender = 'unisex'")

    # 3. Add vehicle-specific columns to products
    op.add_column("products", sa.Column("max_weight_kg", sa.Numeric(6, 1), nullable=True))
    op.add_column("products", sa.Column("product_weight_kg", sa.Numeric(6, 1), nullable=True))
    op.add_column("products", sa.Column("dimensions", sa.String(100), nullable=True))
    op.add_column("products", sa.Column("wheel_type", sa.String(100), nullable=True))
    op.add_column("products", sa.Column("wheel_count", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("max_speed_kmh", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("battery_type", sa.String(100), nullable=True))
    op.add_column("products", sa.Column("has_remote_control", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("products", sa.Column("has_lights", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("products", sa.Column("has_music", sa.Boolean(), server_default="false", nullable=False))

    # 4. Drop material column from products
    op.drop_column("products", "material")

    # 5. Drop size_id foreign key and column from product_variants
    op.drop_constraint("product_variants_size_id_fkey", "product_variants", type_="foreignkey")
    op.drop_column("product_variants", "size_id")

    # 6. Drop sizes table
    op.drop_table("sizes")

    # 7. Rename product_images.url to file_path
    op.alter_column("product_images", "url", new_column_name="file_path")

    # 8. Make order_items.size_name nullable
    op.alter_column("order_items", "size_name", existing_type=sa.String(50), nullable=True)


def downgrade() -> None:
    op.alter_column("order_items", "size_name", existing_type=sa.String(50), nullable=False)
    op.alter_column("product_images", "file_path", new_column_name="url")

    op.create_table(
        "sizes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("size_type", sa.String(50), default="children"),
    )

    op.add_column("product_variants", sa.Column("size_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("product_variants_size_id_fkey", "product_variants", "sizes", ["size_id"], ["id"])

    op.add_column("products", sa.Column("material", sa.String(200), nullable=True))

    op.drop_column("products", "has_music")
    op.drop_column("products", "has_lights")
    op.drop_column("products", "has_remote_control")
    op.drop_column("products", "battery_type")
    op.drop_column("products", "max_speed_kmh")
    op.drop_column("products", "wheel_count")
    op.drop_column("products", "wheel_type")
    op.drop_column("products", "dimensions")
    op.drop_column("products", "product_weight_kg")
    op.drop_column("products", "max_weight_kg")
