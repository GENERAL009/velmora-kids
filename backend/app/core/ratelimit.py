"""Small fixed-window rate limiter backed by Redis (shared by all workers)."""
import logging
import time
from collections import defaultdict

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

_memory: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    from app.api.v1.deps import client_ip
    return client_ip(request)


async def rate_limit(request: Request, scope: str, limit: int = 10, window: int = 60) -> None:
    key = f"rl:{scope}:{_client_ip(request)}"
    try:
        from app.core.cache import get_redis
        r = await get_redis()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window)
        if count > limit:
            raise HTTPException(status_code=429, detail="Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring")
        return
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001 — Redis down: fall back to per-process memory
        logger.debug("rate_limit redis fallback: %s", e)
    now = time.time()
    _memory[key] = [t for t in _memory[key] if now - t < window]
    if len(_memory[key]) >= limit:
        raise HTTPException(status_code=429, detail="Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring")
    _memory[key].append(now)
