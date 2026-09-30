from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Request, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_current_active_user, get_db, RoleChecker
from app.models.user import User, UserRole
from app.models.order import Order, Payment
from app.services import payment_service
from app.schemas.content import PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/{order_id}/initiate")
async def initiate_payment(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    payment_method: str = Body("cash", embed=True),
):
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    provider_name = payment_method if payment_method in ("cash", "card_transfer") else order.payment_method.value
    return await payment_service.initiate_payment(db, order_id, provider_name)


# NOTE: Payme (JSON-RPC Merchant API) and Click (prepare/complete) are not implemented yet.
# The old handlers accepted payloads that real providers never send and could not safely
# mark orders as paid, so they are disabled until a proper integration is written.
@router.post("/payme/callback")
async def payme_callback():
    raise HTTPException(status_code=501, detail="Payme integratsiyasi hali ulanmagan")


@router.post("/click/callback")
async def click_callback():
    raise HTTPException(status_code=501, detail="Click integratsiyasi hali ulanmagan")


@router.get("", response_model=list[PaymentResponse])
async def list_payments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(RoleChecker(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()).limit(100))
    return list(result.scalars().all())


import os
import time
from datetime import datetime, timezone
from fastapi import UploadFile, File

@router.post("/{order_id}/upload-receipt")
async def upload_receipt(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    file: UploadFile = File(...),
):
    from sqlalchemy.orm import selectinload
    from app.core.config import settings
    from app.services.telegram_service import send_payment_verification_request

    # Check order
    order_result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.payments))
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.payment_status.value == "paid":
        raise HTTPException(status_code=400, detail="Bu buyurtma allaqachon to'langan")
    if order.status.value in ("cancelled", "returned"):
        raise HTTPException(status_code=400, detail="Buyurtma bekor qilingan")

    # Find the payment for card_transfer
    payment = next((p for p in order.payments if p.provider.value == "card_transfer"), None)
    if not payment:
        from app.models.order import TransactionStatus, PaymentProvider
        payment = Payment(
            order_id=order.id,
            provider=PaymentProvider.CARD_TRANSFER,
            amount=order.total,
            status=TransactionStatus.PENDING,
        )
        db.add(payment)
        await db.flush()

    # Validate + save file (type/size/content checked; extension never taken from the user)
    from app.utils.uploads import RECEIPT_TYPES, save_upload
    file_path, receipt_url = await save_upload(
        file, "receipts", RECEIPT_TYPES, max_mb=settings.MAX_RECEIPT_SIZE_MB, name_prefix=str(order.id),
    )

    # Update payment record
    from app.models.order import TransactionStatus as _TS, PaymentStatus as _PS
    payment.receipt_image = receipt_url
    payment.receipt_uploaded_at = datetime.now(timezone.utc)
    payment.status = _TS.PENDING  # Reset status if it was failed before
    payment.rejection_reason = None
    if order.payment_status == _PS.FAILED:
        order.payment_status = _PS.PENDING
    await db.commit()

    # Send to Telegram admins with product images + receipt
    customer_name = f"{order.customer_first_name} {order.customer_last_name}"

    # Fetch product images for all order items
    from app.models.order import OrderItem
    from app.models.product import ProductImage, ProductVariant
    from sqlalchemy.orm import selectinload as sl

    items_result = await db.execute(
        select(OrderItem)
        .where(OrderItem.order_id == order.id)
        .options(sl(OrderItem.product_variant))
    )
    items_list = list(items_result.scalars().all())

    product_image_urls = []
    seen_products = set()
    base_url = settings.BACKEND_BASE_URL.rstrip("/") if settings.BACKEND_BASE_URL else ""
    for oi in items_list:
        if oi.product_variant and oi.product_variant.product_id not in seen_products:
            seen_products.add(oi.product_variant.product_id)
            img_result = await db.execute(
                select(ProductImage)
                .where(
                    ProductImage.product_id == oi.product_variant.product_id,
                    ProductImage.is_primary == True,
                )
            )
            img = img_result.scalar_one_or_none()
            if img and img.file_path:
                url = img.file_path
                if url.startswith("/") and base_url:
                    url = base_url + url
                if url.startswith("http"):
                    product_image_urls.append(url)

    import logging as _log
    _logger = _log.getLogger(__name__)

    try:
        results = await send_payment_verification_request(
            payment_id=str(payment.id),
            order_number=order.order_number,
            customer_name=customer_name,
            customer_phone=order.customer_phone,
            amount=f"{payment.amount:,.0f}",
            receipt_path=file_path,
            product_image_urls=product_image_urls,
        )

        telegram_sent = bool(results)
        if results and len(results) > 0 and "result" in results[0]:
            payment.telegram_message_id = results[0]["result"].get("message_id")
            await db.commit()
        elif not results:
            _logger.warning(
                "Telegram notification failed for order %s — check TELEGRAM_BOT_TOKEN and BACKEND_BASE_URL",
                order.order_number,
            )
    except Exception as e:
        _logger.error("Telegram send error for order %s: %s", order.order_number, e)
        telegram_sent = False

    return {
        "status": "ok",
        "receipt_url": payment.receipt_image,
        "telegram_sent": telegram_sent,
    }


@router.get("/{order_id}/status")
async def get_payment_status(
    order_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    from sqlalchemy.orm import selectinload
    
    order_result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.payments))
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
        
    payment = next((p for p in order.payments if p.provider.value == "card_transfer"), None)
    if not payment:
        return {"status": "pending", "has_receipt": False}
        
    return {
        "status": payment.status.value,
        "has_receipt": payment.receipt_image is not None,
        "rejection_reason": payment.rejection_reason,
        "uploaded_at": payment.receipt_uploaded_at,
    }
