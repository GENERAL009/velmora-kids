import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_products_public(client: AsyncClient):
    response = await client.get("/api/v1/products")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_categories_public(client: AsyncClient):
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_brands_public(client: AsyncClient):
    response = await client.get("/api/v1/brands")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_sizes_public(client: AsyncClient):
    response = await client.get("/api/v1/sizes")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_colors_public(client: AsyncClient):
    response = await client.get("/api/v1/colors")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_product_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/products", json={
        "name": "Test Product",
        "brand_id": "00000000-0000-0000-0000-000000000001",
        "category_id": "00000000-0000-0000-0000-000000000001",
        "selling_price": 100000,
        "purchase_price": 50000,
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_category_admin_only(client: AsyncClient, seller_token):
    response = await client.post(
        "/api/v1/categories",
        json={"name": "NewCat", "slug": "newcat"},
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_category_as_admin(client: AsyncClient, admin_token):
    response = await client.post(
        "/api/v1/categories",
        json={"name": "Test Category", "slug": "test-category"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Category"
    assert data["slug"] == "test-category"


@pytest.mark.asyncio
async def test_search_products(client: AsyncClient):
    response = await client.get("/api/v1/products/search?q=dress")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_product_not_found(client: AsyncClient):
    response = await client.get("/api/v1/products/nonexistent-product-slug")
    assert response.status_code == 404
