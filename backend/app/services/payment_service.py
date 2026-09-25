import hashlib
import base64
from abc import ABC, abstractmethod
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.order import Order, Payment, PaymentMethod, PaymentStatus, TransactionStatus
from app.core.config import settings


class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        ...

    @abstractmethod
    async def verify_callback(self, data: dict) -> dict:
        ...


class PaymeProvider(PaymentProvider):
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        amount_tiyin = int(amount * 100)
        return {
            "provider": "payme",
            "merchant_id": settings.PAYME_MERCHANT_ID,
            "amount": amount_tiyin,
            "order_id": str(order_id),
            "payment_url": f"https://checkout.paycom.uz/{settings.PAYME_MERCHANT_ID}",
        }

    async def verify_callback(self, data: dict) -> dict:
        if not settings.PAYME_SECRET_KEY:
            raise HTTPException(status_code=503, detail="Payment provider not configured")
        auth_header = data.pop("_auth_header", "")
        expected = base64.b64encode(
            f"Paycom:{settings.PAYME_SECRET_KEY}".encode()
        ).decode()
        if not auth_header or auth_header != f"Basic {expected}":
            return {"verified": False}
        return {"verified": True, "transaction_id": data.get("id"), "status": "completed"}


class ClickProvider(PaymentProvider):
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        return {
            "provider": "click",
            "merchant_id": settings.CLICK_MERCHANT_ID,
            "amount": float(amount),
            "order_id": str(order_id),
            "payment_url": f"https://my.click.uz/services/pay?merchant_id={settings.CLICK_MERCHANT_ID}",
        }

    async def verify_callback(self, data: dict) -> dict:
        if not settings.CLICK_SECRET_KEY:
            raise HTTPException(status_code=503, detail="Payment provider not configured")
        sign_string = data.get("sign_string", "")
        click_trans_id = str(data.get("click_trans_id", ""))
        merchant_trans_id = str(data.get("merchant_trans_id", ""))
        amount = str(data.get("amount", ""))
        sign_check = hashlib.md5(
            f"{click_trans_id}{merchant_trans_id}{settings.CLICK_SECRET_KEY}{amount}".encode()
        ).hexdigest()
        if sign_string != sign_check:
            return {"verified": False}
        return {"verified": True, "transaction_id": data.get("click_trans_id"), "status": "completed"}


class CashProvider(PaymentProvider):
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        return {"provider": "cash", "order_id": str(order_id), "amount": float(amount), "status": "pending"}

    async def verify_callback(self, data: dict) -> dict:
        return {"verified": True, "transaction_id": None, "status": "completed"}


class CardTransferProvider(PaymentProvider):
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        return {"provider": "card_transfer", "order_id": str(order_id), "amount": float(amount), "status": "pending"}

    async def verify_callback(self, data: dict) -> dict:
        return {"verified": True, "transaction_id": None, "status": "completed"}


class BankTransferProvider(PaymentProvider):
    async def create_payment(self, order_id: UUID, amount: Decimal) -> dict:
        return {"provider": "bank_transfer", "order_id": str(order_id), "amount": float(amount), "status": "pending"}

    async def verify_callback(self, data: dict) -> dict:
        return {"verified": True, "transaction_id": None, "status": "completed"}


PROVIDERS = {
    "payme": PaymeProvider(),
    "click": ClickProvider(),
    "cash": CashProvider(),
    "card_transfer": CardTransferProvider(),
    "bank_transfer": BankTransferProvider(),
}


async def initiate_payment(db: AsyncSession, order_id: UUID, provider_name: str) -> dict:
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    provider = PROVIDERS.get(provider_name.lower())
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unknown payment provider: {provider_name}")

    return await provider.create_payment(order.id, order.total)


async def handle_callback(db: AsyncSession, provider_name: str, data: dict) -> dict:
    provider = PROVIDERS.get(provider_name.lower())
    if not provider:
        raise HTTPException(status_code=400, detail="Unknown provider")

    result = await provider.verify_callback(data)
    if not result.get("verified"):
        raise HTTPException(status_code=400, detail="Callback verification failed")

    # Find and update payment - idempotent check
    order_id_str = data.get("order_id") or data.get("merchant_trans_id")
    if order_id_str:
        from uuid import UUID as UUIDType
        try:
            oid = UUIDType(order_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid order ID")

        payment_result = await db.execute(select(Payment).where(Payment.order_id == oid))
        payment = payment_result.scalar_one_or_none()
        if payment and payment.status != TransactionStatus.COMPLETED:
            payment.status = TransactionStatus.COMPLETED
            payment.transaction_id = result.get("transaction_id")
            payment.provider_data = data

            order_result = await db.execute(select(Order).where(Order.id == oid))
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = PaymentStatus.PAID
                order.paid_at = datetime.now(timezone.utc)

            await db.flush()

    return {"status": "ok"}
