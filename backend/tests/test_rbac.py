import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_seller_cannot_access_users(client: AsyncClient, seller_token):
    response = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_call_center_cannot_access_warehouse(client: AsyncClient, call_center_token):
    response = await client.get(
        "/api/v1/inventory",
        headers={"Authorization": f"Bearer {call_center_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_users(client: AsyncClient, admin_token):
    response = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_can_access_reports(client: AsyncClient, admin_token):
    response = await client.get(
        "/api/v1/reports/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_access_inventory(client: AsyncClient, customer_token):
    response = await client.get(
        "/api/v1/inventory",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_seller_can_access_inventory(client: AsyncClient, seller_token):
    response = await client.get(
        "/api/v1/inventory",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_call_center_can_access_crm(client: AsyncClient, call_center_token):
    response = await client.get(
        "/api/v1/crm/leads",
        headers={"Authorization": f"Bearer {call_center_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_access_crm(client: AsyncClient, customer_token):
    response = await client.get(
        "/api/v1/crm/leads",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_audit_logs(client: AsyncClient, admin_token):
    response = await client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_seller_cannot_access_audit_logs(client: AsyncClient, seller_token):
    response = await client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    assert response.status_code == 403
