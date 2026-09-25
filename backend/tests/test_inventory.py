import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Inventory


@pytest.mark.asyncio
async def test_inventory_requires_role(client: AsyncClient, customer_token):
    response = await client.get(
        "/api/v1/inventory",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_inventory_accessible_to_seller(client: AsyncClient, seller_token):
    response = await client.get(
        "/api/v1/inventory",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_low_stock_endpoint(client: AsyncClient, admin_token):
    response = await client.get(
        "/api/v1/inventory/low-stock",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_out_of_stock_endpoint(client: AsyncClient, admin_token):
    response = await client.get(
        "/api/v1/inventory/out-of-stock",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_inventory_quantity_non_negative(
    db_session: AsyncSession,
    sample_inventory: Inventory,
):
    """Stock quantity must never go below zero (enforced by DB constraint)."""
    assert sample_inventory.quantity >= 0
    assert sample_inventory.reserved >= 0
    available = sample_inventory.quantity - sample_inventory.reserved
    assert available >= 0


@pytest.mark.asyncio
async def test_inventory_available_calculation(
    sample_inventory: Inventory,
):
    """available = quantity - reserved."""
    assert sample_inventory.quantity == 50
    assert sample_inventory.reserved == 0
    assert sample_inventory.available == 50
