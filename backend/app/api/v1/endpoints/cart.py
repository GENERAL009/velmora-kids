from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_current_active_user, get_db
from app.models.user import User
from app.models.content import Cart, CartItem
from app.models.product import ProductVariant
from app.schemas.content import CartItemCreate, CartDetailResponse

router = APIRouter(prefix="/cart", tags=["Cart"])


async def _get_or_create_cart(db: AsyncSession, user_id: UUID) -> Cart:
    result = await db.execute(
        select(Cart).where(Cart.user_id == user_id).options(
            selectinload(Cart.items).selectinload(CartItem.product_variant).selectinload(ProductVariant.product),
            selectinload(Cart.items).selectinload(CartItem.product_variant).selectinload(ProductVariant.size),
            selectinload(Cart.items).selectinload(CartItem.product_variant).selectinload(ProductVariant.color),
        )
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.flush()
        await db.refresh(cart)
    return cart


@router.get("", response_model=CartDetailResponse)
async def get_cart(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    cart = await _get_or_create_cart(db, current_user.id)
    return cart


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=CartDetailResponse)
async def add_item(
    data: CartItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    cart = await _get_or_create_cart(db, current_user.id)

    for item in cart.items:
        if item.product_variant_id == data.product_variant_id:
            item.quantity += data.quantity
            await db.flush()
            return await _get_or_create_cart(db, current_user.id)

    cart_item = CartItem(cart_id=cart.id, product_variant_id=data.product_variant_id, quantity=data.quantity)
    db.add(cart_item)
    await db.flush()
    return await _get_or_create_cart(db, current_user.id)


@router.patch("/items/{item_id}", response_model=CartDetailResponse)
async def update_item(
    item_id: UUID,
    data: CartItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(
        select(CartItem).join(Cart).where(CartItem.id == item_id, Cart.user_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = data.quantity
    await db.flush()
    return await _get_or_create_cart(db, current_user.id)


@router.delete("/items/{item_id}", response_model=CartDetailResponse)
async def remove_item(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(
        select(CartItem).join(Cart).where(CartItem.id == item_id, Cart.user_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.execute(
        delete(CartItem).where(CartItem.id == item_id)
    )
    await db.flush()
    return await _get_or_create_cart(db, current_user.id)


@router.delete("")
async def clear_cart(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    cart = await _get_or_create_cart(db, current_user.id)
    await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    await db.flush()
    return {"message": "Cart cleared"}
