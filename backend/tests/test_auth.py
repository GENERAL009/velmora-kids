import pytest
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_register_customer(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "password": "securepass123",
        "first_name": "New",
        "last_name": "User",
        "phone": "+998900000099",
    })
    assert response.status_code == 201
    tokens = response.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    data = me.json()
    assert data["email"] == "newuser@test.com"
    assert data["first_name"] == "New"
    assert data["role"] == "customer"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, customer_user):
    response = await client.post("/api/v1/auth/register", json={
        "email": "customer@test.com",
        "password": "pass12345",
        "first_name": "Dup",
        "last_name": "User",
    })
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, customer_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "customer@test.com",
        "password": "customer123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, customer_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "customer@test.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, customer_user, customer_token):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "customer@test.com"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
