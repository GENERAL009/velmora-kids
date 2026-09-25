import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.content import Notification


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "system",
    link: str | None = None,
) -> None:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
    )
    db.add(notification)
    await db.flush()
