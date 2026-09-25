import uuid
import math
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.inventory import Inventory, InventoryMovement, MovementType, Warehouse, Supplier, Purchase, PurchaseItem, PurchaseStatus
from app.models.product import ProductVariant


async def get_inventory(db: AsyncSession, filters) -> dict:
    query = select(Inventory).options(
        selectinload(Inventory.product_variant).selectinload(ProductVariant.product),
        selectinload(Inventory.product_variant).selectinload(ProductVariant.size),
        selectinload(Inventory.product_variant).selectinload(ProductVariant.color),
        selectinload(Inventory.warehouse),
        selectinload(Inventory.location),
    )

    if hasattr(filters, 'warehouse_id') and filters.warehouse_id:
        query = query.where(Inventory.warehouse_id == filters.warehouse_id)
    if hasattr(filters, 'low_stock') and filters.low_stock:
        query = query.where(and_(Inventory.quantity > 0, Inventory.quantity <= 5))
    if hasattr(filters, 'out_of_stock') and filters.out_of_stock:
        query = query.where(Inventory.quantity == 0)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    page = getattr(filters, 'page', 1) or 1
    page_size = getattr(filters, 'page_size', 20) or 20
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().unique().all())

    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / page_size) if total > 0 else 1}


async def reserve_stock(db: AsyncSession, variant_id: uuid.UUID, warehouse_id: uuid.UUID, quantity: int, reference_id: uuid.UUID | None, user_id: uuid.UUID) -> InventoryMovement:
    """Reserve stock for an order. Uses SELECT FOR UPDATE to prevent race conditions."""
    inv = await db.execute(
        select(Inventory).where(
            Inventory.product_variant_id == variant_id,
            Inventory.warehouse_id == warehouse_id,
        ).with_for_update()
    )
    inventory = inv.scalar_one_or_none()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No inventory record for variant {variant_id}")

    available = inventory.quantity - inventory.reserved
    if available < quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock. Available: {available}, requested: {quantity}")

    before = inventory.reserved
    inventory.reserved += quantity

    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=MovementType.RESERVED,
        quantity=quantity,
        quantity_before=before,
        quantity_after=inventory.reserved,
        reference_type="order",
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(movement)
    await db.flush()
    return movement


async def release_stock(db: AsyncSession, variant_id: uuid.UUID, warehouse_id: uuid.UUID, quantity: int, reference_id: uuid.UUID | None, user_id: uuid.UUID) -> InventoryMovement:
    """Release reserved stock (order cancelled)."""
    inv = await db.execute(
        select(Inventory).where(
            Inventory.product_variant_id == variant_id,
            Inventory.warehouse_id == warehouse_id,
        ).with_for_update()
    )
    inventory = inv.scalar_one_or_none()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")

    before = inventory.reserved
    inventory.reserved = max(0, inventory.reserved - quantity)

    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=MovementType.RELEASED,
        quantity=-quantity,
        quantity_before=before,
        quantity_after=inventory.reserved,
        reference_type="order",
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(movement)
    await db.flush()
    return movement


async def sell_stock(db: AsyncSession, variant_id: uuid.UUID, warehouse_id: uuid.UUID, quantity: int, reference_id: uuid.UUID | None, user_id: uuid.UUID) -> InventoryMovement:
    """Finalize sale: decrease both quantity and reserved."""
    inv = await db.execute(
        select(Inventory).where(
            Inventory.product_variant_id == variant_id,
            Inventory.warehouse_id == warehouse_id,
        ).with_for_update()
    )
    inventory = inv.scalar_one_or_none()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")

    before_qty = inventory.quantity
    inventory.quantity -= quantity
    inventory.reserved = max(0, inventory.reserved - quantity)

    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=MovementType.SALE,
        quantity=-quantity,
        quantity_before=before_qty,
        quantity_after=inventory.quantity,
        reference_type="order",
        reference_id=reference_id,
        created_by=user_id,
    )
    db.add(movement)
    await db.flush()
    return movement


async def receive_stock(db: AsyncSession, data, user_id: uuid.UUID) -> Purchase:
    """Receive goods from supplier. Creates purchase + updates inventory."""
    purchase_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    total_amount = Decimal(0)

    purchase = Purchase(
        supplier_id=data.supplier_id,
        purchase_number=purchase_number,
        status=PurchaseStatus.RECEIVED,
        total_amount=0,
        notes=getattr(data, 'notes', None),
        created_by=user_id,
        received_by=user_id,
        received_at=datetime.now(timezone.utc),
    )
    db.add(purchase)
    await db.flush()

    for item in data.items:
        item_total = Decimal(str(item.purchase_price)) * item.quantity
        total_amount += item_total

        pi = PurchaseItem(
            purchase_id=purchase.id,
            product_variant_id=item.product_variant_id,
            quantity=item.quantity,
            purchase_price=item.purchase_price,
            total=item_total,
        )
        db.add(pi)

        # Update or create inventory
        inv_result = await db.execute(
            select(Inventory).where(
                Inventory.product_variant_id == item.product_variant_id,
                Inventory.warehouse_id == item.warehouse_id,
            ).with_for_update()
        )
        inventory = inv_result.scalar_one_or_none()

        if inventory:
            before = inventory.quantity
            inventory.quantity += item.quantity
        else:
            inventory = Inventory(
                product_variant_id=item.product_variant_id,
                warehouse_id=item.warehouse_id,
                quantity=item.quantity,
                reserved=0,
                location_id=getattr(item, 'location_id', None),
            )
            db.add(inventory)
            await db.flush()
            before = 0

        movement = InventoryMovement(
            inventory_id=inventory.id,
            movement_type=MovementType.INCOMING,
            quantity=item.quantity,
            quantity_before=before,
            quantity_after=inventory.quantity,
            reference_type="purchase",
            reference_id=purchase.id,
            created_by=user_id,
        )
        db.add(movement)

    purchase.total_amount = total_amount
    await db.flush()
    await db.refresh(purchase)
    return purchase


async def get_movements(db: AsyncSession, inventory_id: uuid.UUID) -> list:
    result = await db.execute(
        select(InventoryMovement).where(InventoryMovement.inventory_id == inventory_id)
        .options(selectinload(InventoryMovement.created_by_user))
        .order_by(InventoryMovement.created_at.desc())
    )
    return list(result.scalars().all())


async def get_low_stock(db: AsyncSession, threshold: int = 5) -> list:
    result = await db.execute(
        select(Inventory).where(
            and_(Inventory.quantity > 0, Inventory.quantity <= threshold)
        ).options(
            selectinload(Inventory.product_variant).selectinload(ProductVariant.product),
            selectinload(Inventory.product_variant).selectinload(ProductVariant.size),
            selectinload(Inventory.product_variant).selectinload(ProductVariant.color),
            selectinload(Inventory.warehouse),
        )
    )
    return list(result.scalars().unique().all())


async def get_out_of_stock(db: AsyncSession) -> list:
    result = await db.execute(
        select(Inventory).where(Inventory.quantity == 0).options(
            selectinload(Inventory.product_variant).selectinload(ProductVariant.product),
            selectinload(Inventory.product_variant).selectinload(ProductVariant.size),
            selectinload(Inventory.product_variant).selectinload(ProductVariant.color),
        )
    )
    return list(result.scalars().unique().all())
