from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_token
from app.db import SessionLocal, get_db
from app.models import AuthSession, User
from app.services import aware

bearer = HTTPBearer(auto_error=False)


async def resolve_user(token: str, db: AsyncSession) -> User:
    try:
        payload = decode_token(token, "access")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    session = await db.scalar(
        select(AuthSession).where(AuthSession.id == payload["sid"], AuthSession.user_id == payload["sub"])
    )
    now = datetime.now(timezone.utc)
    if not session or session.revoked_at or aware(session.expires_at) <= now:
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await resolve_user(credentials.credentials, db)


async def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> AuthSession:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = decode_token(credentials.credentials, "access")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    session = await db.get(AuthSession, payload["sid"])
    if not session or session.user_id != payload["sub"] or session.revoked_at:
        raise HTTPException(status_code=401, detail="Session expired")
    return session


async def websocket_user(websocket: WebSocket, token: str) -> tuple[User, AsyncSession]:
    db = SessionLocal()
    try:
        return await resolve_user(token, db), db
    except Exception:
        await db.close()
        raise
