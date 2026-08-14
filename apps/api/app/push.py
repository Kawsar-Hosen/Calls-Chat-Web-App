import json
import logging
import time
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Device

logger = logging.getLogger(__name__)

_cached_credentials: dict | None = None
_credentials_loaded = False
_token: str | None = None
_token_expires_at = 0.0


def is_configured() -> bool:
    if not settings.fcm_project_id:
        return False
    return _credentials() is not None


def _credentials() -> dict | None:
    global _cached_credentials, _credentials_loaded
    if not _credentials_loaded:
        _credentials_loaded = True
        raw = (settings.fcm_credentials_json or "").strip()
        if not raw and settings.fcm_credentials_file:
            try:
                with open(settings.fcm_credentials_file, encoding="utf-8") as handle:
                    raw = handle.read().strip()
            except Exception:
                logger.error("Could not read FCM_CREDENTIALS_FILE=%s; push notifications disabled", settings.fcm_credentials_file)
                _credentials_loaded = False
                return None
        if not raw:
            return None
        try:
            _cached_credentials = json.loads(raw)
        except Exception:
            logger.error("FCM_CREDENTIALS_JSON is not valid JSON; push notifications disabled")
            _credentials_loaded = False
            return None
    return _cached_credentials


def _access_token() -> str | None:
    global _token, _token_expires_at
    credentials = _credentials()
    if not credentials:
        return None
    if _token and time.time() < _token_expires_at - 60:
        return _token
    now = datetime.now(timezone.utc)
    assertion = jwt.encode(
        {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        credentials["private_key"],
        algorithm="RS256",
    )
    try:
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        _token = payload["access_token"]
        _token_expires_at = time.time() + float(payload.get("expires_in", 3600))
        return _token
    except Exception:
        logger.exception("Could not fetch FCM access token")
        return None


async def send_push(token: str, payload: dict, high_priority: bool = False) -> str:
    """Send a single FCM message. Returns 'ok', 'invalid', 'skipped' or 'error'."""
    access = _access_token()
    if not access:
        return "skipped"
    message: dict = {"token": token, "data": {str(k): str(v) for k, v in payload.get("data", {}).items()}}
    if payload.get("notification"):
        message["notification"] = payload["notification"]
    if payload.get("android") or high_priority:
        android: dict = dict(payload.get("android") or {})
        if high_priority:
            android.setdefault("priority", "high")
            android.setdefault("ttl", "60s")
        message["android"] = android
    if payload.get("apns") or high_priority:
        apns: dict = dict(payload.get("apns") or {})
        if high_priority:
            headers = dict(apns.get("headers") or {})
            headers.setdefault("apns-priority", "10")
            headers.setdefault("apns-expiration", "0")
            apns["headers"] = headers
        message["apns"] = apns
    url = f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
                json={"message": message},
            )
        if response.status_code == 200:
            return "ok"
        if response.status_code == 404:
            return "invalid"
        logger.warning("FCM send status=%s body=%s", response.status_code, response.text[:300])
        return "error"
    except Exception:
        logger.exception("FCM send failed")
        return "error"


async def push_to_users(db: AsyncSession, user_ids: list[str], payload: dict, high_priority: bool = False) -> None:
    """Send a push to every device registered to the given users, pruning invalid tokens."""
    if not user_ids or not is_configured():
        return
    rows = (await db.scalars(select(Device).where(Device.user_id.in_(user_ids)))).all()
    if not rows:
        return
    invalid = []
    for row in rows:
        status = await send_push(row.push_token, payload, high_priority)
        if status == "invalid":
            invalid.append(row)
    for row in invalid:
        await db.delete(row)
    if invalid:
        await db.commit()
