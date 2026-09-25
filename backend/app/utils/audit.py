import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.content import AuditLog


async def log_audit(
    db: AsyncSession,
    user_id: uuid.UUID | None,
    action: str,
    entity: str,
    entity_id: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    ip_address: str | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()
