import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_token(subject: str, token_type: str, lifetime: timedelta, session_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": subject, "type": token_type, "sid": session_id, "iat": now, "exp": now + lifetime},
        settings.jwt_refresh_secret if token_type == "refresh" else settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_access_token(user_id: str, session_id: str) -> str:
    return create_token(user_id, "access", timedelta(minutes=settings.access_token_minutes), session_id)


def create_refresh_token(user_id: str, session_id: str) -> str:
    nonce = secrets.token_urlsafe(16)
    token = create_token(user_id, "refresh", timedelta(days=settings.refresh_token_days), session_id)
    return f"{token}.{nonce}"


def decode_token(token: str, expected_type: str) -> dict:
    encoded = token.rsplit(".", 1)[0] if expected_type == "refresh" else token
    secret = settings.jwt_refresh_secret if expected_type == "refresh" else settings.jwt_secret
    payload = jwt.decode(encoded, secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("wrong token type")
    return payload


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
