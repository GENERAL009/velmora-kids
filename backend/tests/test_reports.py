"""Analytics must count only real money and use shop-local calendar days."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

TZ = ZoneInfo("Asia/Tashkent")


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


def _payload(vid, qty=1):
    return {
        "customer_first_name": "A", "customer_last_name": "B", "customer_phone": "+998901234567",
        "delivery_method": "pickup", "payment_method": "cash",
        "items": [{"product_variant_id": str(vid), "quantity": qty}],
    }


async def _order(client, token, vid, qty=1):
    r = await client.post("/api/v1/orders", json=_payload(vid, qty), headers=_auth(token))
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.mark.asyncio
async def test_reports_count_only_paid_not_cancelled(client: AsyncClient, customer_token, admin_token, sample_variant_with_stock):
    vid = sample_variant_with_stock.id
    paid = await _order(client, customer_token, vid, 2)          # 500 000, paid
    refunded = await _order(client, customer_token, vid, 1)      # paid then cancelled
    await _order(client, customer_token, vid, 1)                 # unpaid, pending

    for oid in (paid, refunded):
        r = await client.patch(f"/api/v1/orders/{oid}/confirm-payment", json={}, headers=_auth(admin_token))
        assert r.status_code == 200, r.text
    r = await client.patch(f"/api/v1/orders/{refunded}/status", json={"status": "cancelled"}, headers=_auth(admin_token))
    assert r.status_code == 200, r.text

    k = (await client.get("/api/v1/reports/dashboard?days=7", headers=_auth(admin_token))).json()
    assert k["revenue"] == 500000
    assert k["paid_orders"] == 1
    assert k["average_order_value"] == 500000
    assert k["orders"] == 3
    assert k["cancelled_orders"] == 1
    assert k["gross_profit"] == 500000 - 2 * 100000   # purchase price 100 000
    assert k["awaiting_payment"] == 1

    series = (await client.get("/api/v1/reports/revenue?days=7", headers=_auth(admin_token))).json()
    assert len(series) == 7                               # no gaps
    today = datetime.now(TZ).date().isoformat()
    assert series[-1]["date"] == today
    assert series[-1]["revenue"] == 500000
    assert sum(p["revenue"] for p in series) == 500000

    by_status = {x["status"]: x["count"] for x in (await client.get(
        "/api/v1/reports/orders-by-status?days=7", headers=_auth(admin_token))).json()}
    assert by_status["new"] == 2 and by_status["cancelled"] == 1

    top = (await client.get("/api/v1/reports/top-products?days=7", headers=_auth(admin_token))).json()
    assert top[0]["sold"] == 2 and top[0]["revenue"] == 500000


@pytest.mark.asyncio
async def test_account_summary_and_addresses(client: AsyncClient, customer_token, admin_token, sample_variant_with_stock):
    oid = await _order(client, customer_token, sample_variant_with_stock.id, 1)
    await client.patch(f"/api/v1/orders/{oid}/confirm-payment", json={}, headers=_auth(admin_token))
    s = (await client.get("/api/v1/account/summary", headers=_auth(customer_token))).json()
    assert s["orders_count"] == 1 and s["total_spent"] == 250000 and s["active_orders_count"] == 1

    a1 = await client.post("/api/v1/account/addresses", json={
        "label": "Uy", "city": "Toshkent", "address": "Chilonzor 5", "latitude": 41.3, "longitude": 69.2,
    }, headers=_auth(customer_token))
    assert a1.status_code == 201 and a1.json()["is_default"] is True
    a2 = await client.post("/api/v1/account/addresses", json={
        "label": "Ish", "city": "Toshkent", "address": "Amir Temur 1", "is_default": True,
    }, headers=_auth(customer_token))
    lst = (await client.get("/api/v1/account/addresses", headers=_auth(customer_token))).json()
    assert [x["label"] for x in lst if x["is_default"]] == ["Ish"]

    d = await client.delete(f"/api/v1/account/addresses/{a2.json()['id']}", headers=_auth(customer_token))
    assert d.status_code == 204
    lst = (await client.get("/api/v1/account/addresses", headers=_auth(customer_token))).json()
    assert len(lst) == 1 and lst[0]["is_default"] is True


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, db_session, customer_token):
    await db_session.commit()  # the 400 below rolls the shared test session back
    bad = await client.post("/api/v1/account/change-password", json={
        "current_password": "wrong", "new_password": "newpass123"}, headers=_auth(customer_token))
    assert bad.status_code == 400 and bad.json()["detail"] == "wrong_current_password"
    ok = await client.post("/api/v1/account/change-password", json={
        "current_password": "customer123", "new_password": "newpass123"}, headers=_auth(customer_token))
    assert ok.status_code == 204
    login = await client.post("/api/v1/auth/login", json={"email": "customer@test.com", "password": "newpass123"})
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_favorites_include_image(client: AsyncClient, db_session, customer_token, sample_product):
    from app.models.product import ProductImage
    db_session.add(ProductImage(product_id=sample_product.id, file_path="/uploads/p/1.jpg", is_primary=True, sort_order=0))
    await db_session.flush()
    db_session.expire(sample_product, ["images"])
    await client.post(f"/api/v1/favorites/{sample_product.id}", headers=_auth(customer_token))
    favs = (await client.get("/api/v1/favorites", headers=_auth(customer_token))).json()
    assert favs[0]["product"]["image"] == "/uploads/p/1.jpg"
    assert favs[0]["product"]["status"] == "active"
