"""Regression tests for order / payment / stock / security fixes."""
import io
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.models.content import DiscountType, Promotion, PromotionAppliesTo
from app.models.order import Payment
from app.models.product import ProductStatus, ProductVariant


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _order_payload(variant_id, qty=1, **extra):
    data = {
        "customer_first_name": "Test",
        "customer_last_name": "User",
        "customer_phone": "+998901234567",
        "delivery_method": "courier",
        "delivery_city": "Toshkent",
        "delivery_address": "Chilonzor 1-kvartal, 5-uy",
        "payment_method": "cash",
        "items": [{"product_variant_id": str(variant_id), "quantity": qty}],
    }
    data.update(extra)
    return data


async def _stock(db_session, variant_id) -> int:
    db_session.expire_all()
    v = (await db_session.execute(select(ProductVariant).where(ProductVariant.id == variant_id))).scalar_one()
    return v.stock


@pytest.mark.asyncio
async def test_order_total_includes_delivery_fee_and_coords(client: AsyncClient, customer_token, sample_variant_with_stock):
    r = await client.post(
        "/api/v1/orders",
        json=_order_payload(sample_variant_with_stock.id, 2, delivery_lat=41.311081, delivery_lon=69.240562),
        headers=_auth(customer_token),
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["subtotal"] == 500000
    assert data["delivery_fee"] == settings.DELIVERY_FEE_COURIER
    assert data["total"] == 500000 + settings.DELIVERY_FEE_COURIER
    assert abs(data["delivery_lat"] - 41.311081) < 1e-6
    assert abs(data["delivery_lon"] - 69.240562) < 1e-6


@pytest.mark.asyncio
async def test_pickup_has_no_delivery_fee(client: AsyncClient, customer_token, sample_variant_with_stock):
    r = await client.post(
        "/api/v1/orders",
        json=_order_payload(sample_variant_with_stock.id, 1, delivery_method="pickup"),
        headers=_auth(customer_token),
    )
    assert r.status_code == 201, r.text
    assert r.json()["total"] == 250000


@pytest.mark.asyncio
async def test_coupon_applied_on_server(client: AsyncClient, db_session, customer_token, sample_variant_with_stock):
    now = datetime.now(timezone.utc)
    db_session.add(Promotion(
        name="Test 10%", code="TEST10", discount_type=DiscountType.PERCENTAGE, discount_value=Decimal("10"),
        applies_to=PromotionAppliesTo.ALL, start_date=now - timedelta(days=1), end_date=now + timedelta(days=1),
        is_active=True, used_count=0,
    ))
    await db_session.flush()

    r = await client.post(
        "/api/v1/orders",
        json=_order_payload(sample_variant_with_stock.id, 2, delivery_method="pickup", promo_code="test10"),
        headers=_auth(customer_token),
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["discount_amount"] == 50000
    assert data["total"] == 450000

    bad = await client.post(
        "/api/v1/orders",
        json=_order_payload(sample_variant_with_stock.id, 1, promo_code="NOPE"),
        headers=_auth(customer_token),
    )
    assert bad.status_code == 404


@pytest.mark.asyncio
async def test_cancel_unpaid_order_does_not_create_stock(client: AsyncClient, db_session, customer_token, sample_variant_with_stock):
    vid = sample_variant_with_stock.id
    r = await client.post("/api/v1/orders", json=_order_payload(vid, 3), headers=_auth(customer_token))
    assert r.status_code == 201
    order_id = r.json()["id"]

    c = await client.patch(f"/api/v1/orders/{order_id}/cancel", headers=_auth(customer_token))
    assert c.status_code == 200, c.text
    assert c.json()["status"] == "cancelled"
    assert await _stock(db_session, vid) == 50

    # cancelling again is not allowed (would double-return stock)
    again = await client.patch(f"/api/v1/orders/{order_id}/cancel", headers=_auth(customer_token))
    assert again.status_code == 400


@pytest.mark.asyncio
async def test_confirm_payment_takes_stock_and_cancel_returns_it(
    client: AsyncClient, db_session, customer_token, admin_token, sample_variant_with_stock,
):
    vid = sample_variant_with_stock.id
    r = await client.post("/api/v1/orders", json=_order_payload(vid, 4), headers=_auth(customer_token))
    order_id = r.json()["id"]

    ok = await client.patch(f"/api/v1/orders/{order_id}/confirm-payment", json={}, headers=_auth(admin_token))
    assert ok.status_code == 200, ok.text
    assert ok.json()["payment_status"] == "paid"
    assert await _stock(db_session, vid) == 46

    twice = await client.patch(f"/api/v1/orders/{order_id}/confirm-payment", json={}, headers=_auth(admin_token))
    assert twice.status_code == 400
    assert await _stock(db_session, vid) == 46

    # customer can't cancel a paid order themselves
    cust = await client.patch(f"/api/v1/orders/{order_id}/cancel", headers=_auth(customer_token))
    assert cust.status_code == 400

    cancel = await client.patch(
        f"/api/v1/orders/{order_id}/status", json={"status": "cancelled"}, headers=_auth(admin_token),
    )
    assert cancel.status_code == 200, cancel.text
    assert await _stock(db_session, vid) == 50


@pytest.mark.asyncio
async def test_delivered_cash_order_takes_stock_once(
    client: AsyncClient, db_session, customer_token, admin_token, sample_variant_with_stock,
):
    vid = sample_variant_with_stock.id
    r = await client.post("/api/v1/orders", json=_order_payload(vid, 2), headers=_auth(customer_token))
    order_id = r.json()["id"]
    d = await client.patch(f"/api/v1/orders/{order_id}/status", json={"status": "delivered"}, headers=_auth(admin_token))
    assert d.status_code == 200, d.text
    assert d.json()["payment_status"] == "paid"
    assert await _stock(db_session, vid) == 48


@pytest.mark.asyncio
async def test_invalid_status_returns_400(client: AsyncClient, customer_token, admin_token, sample_variant_with_stock):
    r = await client.post("/api/v1/orders", json=_order_payload(sample_variant_with_stock.id), headers=_auth(customer_token))
    bad = await client.patch(
        f"/api/v1/orders/{r.json()['id']}/status", json={"status": "flying"}, headers=_auth(admin_token),
    )
    assert bad.status_code == 400


@pytest.mark.asyncio
async def test_insufficient_stock_rejected(client: AsyncClient, customer_token, sample_variant_with_stock):
    r = await client.post("/api/v1/orders", json=_order_payload(sample_variant_with_stock.id, 51), headers=_auth(customer_token))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_pos_sale_works(client: AsyncClient, db_session, seller_token, sample_variant_with_stock):
    r = await client.post(
        "/api/v1/inventory/pos-sale",
        json={"items": [{"variant_id": str(sample_variant_with_stock.id), "quantity": 2}], "payment_method": "cash"},
        headers=_auth(seller_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 500000
    assert await _stock(db_session, sample_variant_with_stock.id) == 48


@pytest.mark.asyncio
async def test_public_product_hides_purchase_price(client: AsyncClient, admin_token, sample_variant):
    pub = await client.get("/api/v1/products/detskiy-samokat")
    assert pub.status_code == 200
    assert "purchase_price" not in pub.json()

    adm = await client.get("/api/v1/products/detskiy-samokat", headers=_auth(admin_token))
    assert adm.status_code == 200
    assert float(adm.json()["purchase_price"]) == 100000


@pytest.mark.asyncio
async def test_draft_product_hidden_from_public(client: AsyncClient, db_session, admin_token, sample_product):
    sample_product.status = ProductStatus.DRAFT
    await db_session.commit()  # 404 below rolls the shared test session back
    assert (await client.get("/api/v1/products/detskiy-samokat", headers=_auth(admin_token))).status_code == 200
    assert (await client.get("/api/v1/products/detskiy-samokat")).status_code == 404


@pytest.mark.asyncio
async def test_telegram_webhook_requires_secret(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "s3cret")
    body = {"callback_query": {"id": "1", "data": f"approve_payment:{uuid.uuid4()}", "from": {"id": 1}}}
    assert (await client.post("/api/v1/bot/webhook", json=body)).status_code == 403
    assert (await client.post(
        "/api/v1/bot/webhook", json=body, headers={"X-Telegram-Bot-Api-Secret-Token": "wrong"},
    )).status_code == 403


@pytest.mark.asyncio
async def test_telegram_webhook_ignores_non_admin(
    client: AsyncClient, db_session, monkeypatch, customer_token, sample_variant_with_stock,
):
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "s3cret")
    r = await client.post("/api/v1/orders", json=_order_payload(sample_variant_with_stock.id), headers=_auth(customer_token))
    order_id = uuid.UUID(r.json()["id"])
    payment = (await db_session.execute(select(Payment).where(Payment.order_id == order_id))).scalar_one()

    body = {"callback_query": {"id": "1", "data": f"approve_payment:{payment.id}", "from": {"id": 999}}}
    resp = await client.post("/api/v1/bot/webhook", json=body, headers={"X-Telegram-Bot-Api-Secret-Token": "s3cret"})
    assert resp.status_code == 200
    got = await client.get(f"/api/v1/orders/{order_id}", headers=_auth(customer_token))
    assert got.json()["payment_status"] == "pending"


@pytest.mark.asyncio
async def test_receipt_upload_rejects_html(client: AsyncClient, customer_token, sample_variant_with_stock, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    r = await client.post(
        "/api/v1/orders",
        json=_order_payload(sample_variant_with_stock.id, payment_method="card_transfer"),
        headers=_auth(customer_token),
    )
    order_id = r.json()["id"]
    html = b"<html><script>alert(1)</script></html>"
    bad = await client.post(
        f"/api/v1/payments/{order_id}/upload-receipt",
        files={"file": ("receipt.html", io.BytesIO(html), "text/html")},
        headers=_auth(customer_token),
    )
    assert bad.status_code == 400
    disguised = await client.post(
        f"/api/v1/payments/{order_id}/upload-receipt",
        files={"file": ("receipt.jpg", io.BytesIO(html), "image/jpeg")},
        headers=_auth(customer_token),
    )
    assert disguised.status_code == 400

    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(buf, format="PNG")
    good = await client.post(
        f"/api/v1/payments/{order_id}/upload-receipt",
        files={"file": ("chek.html", io.BytesIO(buf.getvalue()), "image/png")},
        headers=_auth(customer_token),
    )
    assert good.status_code == 200, good.text
    assert good.json()["receipt_url"].endswith(".png")


@pytest.mark.asyncio
async def test_approved_order_sends_location_to_channel(monkeypatch):
    from app.services import telegram_service as tg

    calls = []

    async def fake_send(method, data=None, files=None):
        calls.append((method, data))
        return {"ok": True, "result": {"message_id": 77}}

    monkeypatch.setattr(tg, "_send_request", fake_send)
    monkeypatch.setattr(settings, "TELEGRAM_GROUP_ID", "-100123")
    await tg.notify_payment_approved(
        order_number="VK-1", customer_name="Ali <b>", customer_phone="+998", amount="100",
        address="Toshkent", items_text="  • X × 1\n", approved_by="Admin",
        latitude=Decimal("41.31108100"), longitude=Decimal("69.24056200"),
    )
    methods = [c[0] for c in calls]
    assert methods == ["sendMessage", "sendLocation"]
    assert "&lt;b&gt;" in calls[0][1]["text"]  # user input is escaped
    loc = calls[1][1]
    assert loc["chat_id"] == "-100123"
    assert loc["latitude"] == pytest.approx(41.311081)
    assert loc["longitude"] == pytest.approx(69.240562)
    assert loc["reply_parameters"]["message_id"] == 77


@pytest.mark.asyncio
async def test_no_location_when_not_selected(monkeypatch):
    from app.services import telegram_service as tg

    calls = []

    async def fake_send(method, data=None, files=None):
        calls.append(method)
        return {"ok": True, "result": {"message_id": 1}}

    monkeypatch.setattr(tg, "_send_request", fake_send)
    monkeypatch.setattr(settings, "TELEGRAM_GROUP_ID", "-100123")
    await tg.notify_payment_approved(
        order_number="VK-2", customer_name="A", customer_phone="+998", amount="1",
        address="", items_text="", approved_by="Admin",
    )
    assert calls == ["sendMessage"]


@pytest.mark.asyncio
async def test_courier_free_above_threshold(client: AsyncClient, customer_token, sample_variant_with_stock):
    # 3 × 250 000 = 750 000 > 500 000 → free courier delivery (same rule as the cart page)
    r = await client.post("/api/v1/orders", json=_order_payload(sample_variant_with_stock.id, 3), headers=_auth(customer_token))
    assert r.status_code == 201, r.text
    assert r.json()["delivery_fee"] == 0
    assert r.json()["total"] == 750000


@pytest.mark.asyncio
async def test_trust_badges_managed_from_admin(client: AsyncClient, admin_token, customer_token, tmp_path, monkeypatch):
    from app.api.v1.endpoints import settings as site_settings
    monkeypatch.setattr(site_settings, "SETTINGS_FILE", tmp_path / "site_settings.json")

    # defaults: the three built-in badges
    data = (await client.get("/api/v1/settings/site")).json()
    assert [b["icon"] for b in data["trust_badges"]] == ["truck", "rotate", "shield"]

    badges = [
        {"icon": "gift", "title_uz": "Sovg'a", "title_ru": "Подарок", "enabled": True},
        {"icon": "truck", "title_uz": "  ", "title_ru": "", "enabled": True},  # empty -> dropped
        {"icon": "shield", "title_uz": "Kafolat", "title_ru": "Гарантия", "enabled": False},
    ]
    ok = await client.put("/api/v1/settings/site", json={"trust_badges": badges}, headers=_auth(admin_token))
    assert ok.status_code == 200
    saved = (await client.get("/api/v1/settings/site")).json()["trust_badges"]
    assert [(b["icon"], b["enabled"]) for b in saved] == [("gift", True), ("shield", False)]

    bad = await client.put(
        "/api/v1/settings/site", json={"trust_badges": [{"icon": "<script>", "title_uz": "x"}]}, headers=_auth(admin_token)
    )
    assert bad.status_code == 422

    # last: a failed request rolls back the shared test session
    forbidden = await client.put("/api/v1/settings/site", json={"trust_badges": badges}, headers=_auth(customer_token))
    assert forbidden.status_code == 403
