import asyncio
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    """Single-process foundation; replace with Redis for multi-worker deployments."""

    def __init__(self) -> None:
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        async with self.lock:
            bucket = self.hits[key]
            while bucket and bucket[0] <= now - window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(status_code=429, detail="Too many requests")
            bucket.append(now)


limiter = InMemoryRateLimiter()


async def auth_rate_limit(request: Request) -> None:
    await limiter.check(f"auth:{request.client.host if request.client else 'unknown'}", 20, 60)
