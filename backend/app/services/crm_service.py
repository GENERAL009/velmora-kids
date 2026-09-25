import uuid
import math
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.crm import CRMLead, CRMActivity, CustomerProfile, LeadStatus
from app.models.user import User, UserRole
from app.models.order import Order


async def get_leads(db: AsyncSession, filters) -> dict:
    query = select(CRMLead).options(
        selectinload(CRMLead.customer),
        selectinload(CRMLead.assigned_user),
        selectinload(CRMLead.product),
    )

    if hasattr(filters, 'status') and filters.status:
        query = query.where(CRMLead.status == filters.status)
    if hasattr(filters, 'assigned_to') and filters.assigned_to:
        query = query.where(CRMLead.assigned_to == filters.assigned_to)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    page = getattr(filters, 'page', 1) or 1
    page_size = getattr(filters, 'page_size', 20) or 20
    query = query.order_by(CRMLead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().unique().all())

    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / page_size) if total > 0 else 1}


async def create_lead(db: AsyncSession, data, created_by: uuid.UUID) -> CRMLead:
    lead = CRMLead(
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        source=data.source,
        message=getattr(data, 'message', None),
        product_id=getattr(data, 'product_id', None),
        priority=getattr(data, 'priority', 'medium'),
        status=LeadStatus.NEW,
    )
    db.add(lead)
    await db.flush()

    activity = CRMActivity(
        lead_id=lead.id,
        activity_type="created",
        description=f"Lead created from {data.source}",
        performed_by=created_by,
    )
    db.add(activity)
    await db.flush()
    await db.refresh(lead)
    return lead


async def update_lead(db: AsyncSession, lead_id: uuid.UUID, data) -> CRMLead:
    result = await db.execute(select(CRMLead).where(CRMLead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    await db.flush()
    await db.refresh(lead)
    return lead


async def get_customer_timeline(db: AsyncSession, customer_id: uuid.UUID) -> list:
    result = await db.execute(
        select(CRMActivity).where(CRMActivity.customer_id == customer_id)
        .options(selectinload(CRMActivity.performer))
        .order_by(CRMActivity.created_at.desc())
    )
    return list(result.scalars().all())


async def get_dashboard_stats(db: AsyncSession) -> dict:
    new_leads = (await db.execute(select(func.count()).where(CRMLead.status == LeadStatus.NEW))).scalar() or 0
    in_progress = (await db.execute(select(func.count()).where(CRMLead.status == LeadStatus.IN_PROGRESS))).scalar() or 0
    total_leads = (await db.execute(select(func.count()).select_from(CRMLead))).scalar() or 0

    return {
        "new_leads": new_leads,
        "in_progress": in_progress,
        "total_leads": total_leads,
    }
