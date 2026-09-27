import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import ProductVariant


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
async def test_stock_is_non_negative(
    db_session: AsyncSession,
    sample_variant_with_stock: ProductVariant,
):
    assert sample_variant_with_stock.stock >= 0
    assert sample_variant_with_stock.stock == 50
