import asyncio
import time

import httpx

from app.config import settings

_TTL = 3600
_cache: dict = {"expires_at": 0.0, "ice_servers": None}
_lock = asyncio.Lock()


def turn_configured() -> bool:
    return bool(settings.turn_key_id and settings.turn_api_token)


async def generate_turn_credentials() -> list[dict]:
    """Short-lived Cloudflare Calls TURN credentials for one RTCPeerConnection."""
    async with _lock:
        if _cache["ice_servers"] and time.monotonic() < _cache["expires_at"]:
            return _cache["ice_servers"]
        headers = {"Authorization": f"Bearer {settings.turn_api_token}"}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"https://rtc.live.cloudflare.com/v1/turn/keys/{settings.turn_key_id}/credentials/generate",
                json={"ttl": _TTL},
                headers=headers,
            )
            response.raise_for_status()
            servers = response.json().get("iceServers") or {}
        result = [{
            "urls": servers.get("urls", []),
            "username": servers.get("username", ""),
            "credential": servers.get("credential", ""),
        }]
        _cache["ice_servers"] = result
        _cache["expires_at"] = time.monotonic() + _TTL * 0.8
        return result
