import json
import logging
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def cache_get(key: str) -> Any | None:
    try:
        r = await get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning("Redis cache_get error: %s", e)
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    try:
        r = await get_redis()
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as e:
        logger.warning("Redis cache_set error: %s", e)


async def cache_delete_pattern(pattern: str) -> None:
    try:
        r = await get_redis()
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
    except Exception as e:
        logger.warning("Redis cache_delete_pattern error: %s", e)


async def cache_delete(key: str) -> None:
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception as e:
        logger.warning("Redis cache_delete error: %s", e)
