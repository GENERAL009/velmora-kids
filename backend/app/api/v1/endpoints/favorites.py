from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_current_active_user, get_db
from app.models.user import User
from app.models.content import Favorite
from app.models.product import Product
from app.schemas.content import FavoriteResponse

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("", response_model=list[FavoriteResponse])
async def list_favorites(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id)
        .options(selectinload(Favorite.product).selectinload(Product.images))
    )
    return list(result.scalars().all())


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
async def toggle_favorite(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.product_id == product_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()
        return {"status": "removed"}
    fav = Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    await db.flush()
    return {"status": "added"}


@router.delete("/{product_id}")
async def remove_favorite(
    product_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    await db.execute(
        delete(Favorite).where(Favorite.user_id == current_user.id, Favorite.product_id == product_id)
    )
    await db.flush()
    return {"status": "removed"}
