import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_order_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/orders", json={
        "customer_first_name": "Test",
        "customer_last_name": "User",
        "customer_phone": "+998901234567",
        "payment_method": "cash",
        "items": [],
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_orders_authenticated(client: AsyncClient, customer_token):
    response = await client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_update_order_status(client: AsyncClient, customer_token):
    import uuid
    fake_id = str(uuid.uuid4())
    response = await client.patch(
        f"/api/v1/orders/{fake_id}/status",
        json={"status": "confirmed"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_payments_admin_only(client: AsyncClient, admin_token, seller_token):
    admin_response = await client.get(
        "/api/v1/payments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_response.status_code == 200

    seller_response = await client.get(
        "/api/v1/payments",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert seller_response.status_code == 403
