import asyncio
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse
from urllib.request import urlopen
import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from jwt import PyJWKClient
from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (create_access_token, create_refresh_token, decode_token, hash_password,
                      token_digest, verify_password)
from app.config import settings
from app.db import get_db
from app.dependencies import get_current_session, get_current_user, websocket_user
from app.email import generate_deletion_code, mask_email, render_deletion_email, render_password_reset_email, send_email
from app.models import (AccountDeletion, AuthSession, Block, CallOffer, Conversation, ConversationMember, Device,
                        FriendRequest, Friendship, Group, GroupApplication, GroupMember, MediaAttachment,
                        Message, MessageRead, PasswordReset, Reaction, User, new_id, utcnow)
from app.push import push_to_users
from app.rate_limit import auth_rate_limit
from app.schemas import *
from app.services import (are_friends, aware, ensure_not_blocked, group_customization, group_settings,
                          group_summary, group_view, member_ids, message_view, public_members,
                          require_group, require_group_member, require_group_role, require_member,
                          set_group_customization, set_group_settings, sync_group_conversation_members,
                          unread_count)
from app.storage import storage
from app.turn import generate_turn_credentials, turn_configured
from app.websocket import manager

router = APIRouter()


def _giphy_json(path: str, params: dict[str, str | int]) -> dict:
    query = urlencode({**params, "api_key": settings.giphy_api_key})
    with urlopen(f"https://api.giphy.com/v1/{path}?{query}", timeout=8) as response:
        return json.loads(response.read())


def _giphy_item(item: dict, kind: str) -> dict:
    images = item.get("images", {})
    original = images.get("original", {})
    preview = images.get("fixed_width", {}) or images.get("downsized", {}) or original
    return {
        "id": str(item.get("id", "")), "kind": kind, "title": str(item.get("title", "")),
        "url": str(original.get("url", "")), "preview_url": str(preview.get("url", "")),
        "width": int(original.get("width") or 1), "height": int(original.get("height") or 1),
    }


def pair_key(a: str, b: str) -> str:
    return ":".join(sorted((a, b)))


def offline_recipients(member_user_ids: list[str], exclude: str) -> list[str]:
    return [uid for uid in member_user_ids if uid != exclude and uid not in manager.connections]


async def push_friend_request(db: AsyncSession, requester: User, recipient_id: str) -> None:
    offline = offline_recipients([recipient_id], requester.id)
    if offline:
        await push_to_users(db, offline, {
            "notification": {"title": "Friend request", "body": f"{requester.display_name} sent you a friend request"},
            "android": {"notification": {"channel_id": "messages"}},
            "data": {"type": "friend.request.received", "requester_id": requester.id, "recipient_id": recipient_id},
        })


def message_push_preview(item: Message, attachments: list[MediaAttachment], fallback: str) -> str:
    if item.content:
        return item.content
    if attachments:
        mime = attachments[0].mime_type or ""
        if mime.startswith("image/gif") or mime.startswith("video/mp4"):
            return "GIF"
        if mime.startswith("image/"):
            return "Photo"
        if mime.startswith("video/"):
            return "Video"
        if mime.startswith("audio/"):
            return "Voice message"
        return "Attachment"
    return fallback


async def issue_tokens(db: AsyncSession, user: User, device_name: str, request: Request | None) -> TokenPair:
    session_id = new_id()
    refresh = create_refresh_token(user.id, session_id)
    session = AuthSession(id=session_id, user_id=user.id, refresh_token_hash=token_digest(refresh),
                          device_name=device_name, user_agent=request.headers.get("user-agent") if request else None,
                          ip_address=request.client.host if request and request.client else None,
                          expires_at=utcnow() + timedelta(days=settings.refresh_token_days))
    db.add(session)
    return TokenPair(access_token=create_access_token(user.id, session.id), refresh_token=refresh)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/register", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit)])
async def register(data: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(User.id).where(or_(User.email == data.email.lower(), User.username == data.username))):
        raise HTTPException(409, "Email or username already exists")
    user = User(email=data.email.lower(), username=data.username, display_name=data.display_name,
                password_hash=hash_password(data.password))
    db.add(user)
    await db.flush()
    tokens = await issue_tokens(db, user, data.device_name, request)
    await db.commit()
    return AuthResponse(**tokens.model_dump(), user=user)


@router.post("/auth/login", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit)])
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    tokens = await issue_tokens(db, user, data.device_name, request)
    await db.commit()
    return AuthResponse(**tokens.model_dump(), user=user)


_jwk_client: PyJWKClient | None = None


def _google_jwks() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")
    return _jwk_client


def _google_claims(id_token: str) -> dict:
    audiences = [client_id for client_id in (settings.google_client_id, settings.google_android_client_id,
                                             settings.google_ios_client_id) if client_id]
    if not audiences:
        raise HTTPException(503, "Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the server.")
    try:
        key = _google_jwks().get_signing_key_from_jwt(id_token)
        return jwt.decode(id_token, key, algorithms=["RS256"], audience=audiences,
                          issuer=["accounts.google.com", "https://accounts.google.com"])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(401, "Invalid Google sign-in token") from exc


async def _available_username(db: AsyncSession, preferred: str) -> str:
    base = "".join(ch for ch in preferred.lower() if ch.isalnum() or ch == "_")[:24] or "user"
    candidate = base
    for suffix in range(1, 100):
        if not await db.scalar(select(User.id).where(User.username == candidate)):
            return candidate
        candidate = f"{base}{suffix}"
    return f"{base}{secrets.token_hex(2)}"


@router.post("/auth/google", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit)])
async def google_auth(data: GoogleAuthRequest, request: Request, db: AsyncSession = Depends(get_db)):
    claims = _google_claims(data.id_token)
    email = str(claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise HTTPException(400, "Your Google account does not have a verified email address")
    display_name = str(claims.get("name") or "").strip()[:80] or email.split("@", 1)[0][:80]
    picture = str(claims.get("picture") or "").strip() or None
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        username = await _available_username(db, email.split("@", 1)[0])
        user = User(email=email, username=username, display_name=display_name,
                    password_hash=hash_password(secrets.token_urlsafe(48)),
                    avatar_url=picture if picture.startswith("https://") else None)
        db.add(user)
        await db.flush()
    tokens = await issue_tokens(db, user, data.device_name, request)
    await db.commit()
    return AuthResponse(**tokens.model_dump(), user=user)


@router.post("/auth/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token, "refresh")
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Invalid refresh token") from exc
    session = await db.scalar(select(AuthSession).where(AuthSession.id == payload["sid"], AuthSession.user_id == payload["sub"]))
    now = utcnow()
    if not session or session.revoked_at or aware(session.expires_at) < now or session.refresh_token_hash != token_digest(data.refresh_token):
        raise HTTPException(401, "Refresh session expired or revoked")
    session.revoked_at = now
    user = await db.get(User, session.user_id)
    tokens = await issue_tokens(db, user, session.device_name, None)
    await db.commit()
    return tokens


@router.post("/auth/logout", status_code=204)
async def logout(session: AuthSession = Depends(get_current_session), db: AsyncSession = Depends(get_db)):
    session.revoked_at = utcnow()
    await db.commit()


@router.post("/auth/forgot-password", status_code=204)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email))
    if not user:
        return
    if not settings.smtp_user and not settings.smtp_password:
        raise HTTPException(503, "Email sending is not configured.")
    code = generate_deletion_code()
    existing = await db.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id))
    if existing:
        existing.code_hash = hashlib.sha256(code.encode()).hexdigest()
        existing.expires_at = utcnow() + timedelta(minutes=10)
    else:
        db.add(PasswordReset(user_id=user.id, code_hash=hashlib.sha256(code.encode()).hexdigest(),
                             expires_at=utcnow() + timedelta(minutes=10)))
    await db.flush()
    try:
        await asyncio.to_thread(send_email, user.email, "Reset your XYTEEE password",
                                render_password_reset_email(code, user.display_name))
    except HTTPException:
        await db.rollback()
        raise
    await db.commit()


@router.post("/auth/verify-reset-code", status_code=204)
async def verify_reset_code(data: VerifyResetCodeRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user:
        raise HTTPException(400, "Invalid code")
    pending = await db.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id))
    if not pending or not hmac.compare_digest(pending.code_hash, hashlib.sha256(data.code.encode()).hexdigest()):
        raise HTTPException(400, "Invalid verification code")
    if aware(pending.expires_at) < utcnow():
        raise HTTPException(400, "Verification code expired. Request a new one.")


@router.post("/auth/reset-password", status_code=204)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user:
        raise HTTPException(400, "Invalid code")
    pending = await db.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id))
    if not pending or not hmac.compare_digest(pending.code_hash, hashlib.sha256(data.code.encode()).hexdigest()):
        raise HTTPException(400, "Invalid verification code")
    if aware(pending.expires_at) < utcnow():
        raise HTTPException(400, "Verification code expired. Request a new one.")
    user.password_hash = hash_password(data.password)
    await db.delete(pending)
    await db.commit()


@router.post("/account/delete/request", response_model=DeletionCodeSent)
async def request_account_deletion(data: DeletionCodeRequest, user: User = Depends(get_current_user),
                                   db: AsyncSession = Depends(get_db)):
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect password")
    if not settings.smtp_user and not settings.smtp_password:
        raise HTTPException(503, "Email sending is not configured. Set SMTP_USER, SMTP_PASSWORD and SMTP_FROM in the environment.")
    code = generate_deletion_code()
    existing = await db.scalar(select(AccountDeletion).where(AccountDeletion.user_id == user.id))
    if existing:
        existing.code_hash = hashlib.sha256(code.encode()).hexdigest()
        existing.expires_at = utcnow() + timedelta(minutes=10)
    else:
        db.add(AccountDeletion(user_id=user.id, code_hash=hashlib.sha256(code.encode()).hexdigest(),
                               expires_at=utcnow() + timedelta(minutes=10)))
    await db.flush()
    try:
        await asyncio.to_thread(send_email, user.email, "Confirm account deletion",
                                render_deletion_email(code, user.display_name))
    except HTTPException:
        await db.rollback()
        raise
    await db.commit()
    return DeletionCodeSent(message="Verification code sent to your email", email_masked=mask_email(user.email))


@router.delete("/account", status_code=204)
async def delete_account(data: DeleteAccountRequest, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect password")
    pending = await db.scalar(select(AccountDeletion).where(AccountDeletion.user_id == user.id))
    if not pending or not hmac.compare_digest(pending.code_hash, hashlib.sha256(data.code.encode()).hexdigest()):
        raise HTTPException(400, "Invalid verification code")
    if aware(pending.expires_at) < utcnow():
        raise HTTPException(400, "Verification code expired. Request a new one.")

    direct_conversation_ids = list((await db.execute(
        select(ConversationMember.conversation_id)
        .join(Conversation, Conversation.id == ConversationMember.conversation_id)
        .where(ConversationMember.user_id == user.id, Conversation.kind == "direct")
    )).scalars().all())
    group_conversation_ids = list((await db.execute(
        select(Group.conversation_id).where(Group.owner_id == user.id)
    )).scalars().all())
    remove_ids = [c for c in set(direct_conversation_ids + group_conversation_ids) if c]
    if remove_ids:
        await db.execute(delete(Conversation).where(Conversation.id.in_(remove_ids)))

    await storage.delete(user.avatar_url)
    media_urls = list((await db.execute(
        select(MediaAttachment.url).where(MediaAttachment.uploader_id == user.id)
    )).scalars().all())
    for url in media_urls:
        await storage.delete(url)

    await db.delete(user)
    await db.flush()
    orphan_conversation_ids = list((await db.execute(
        select(Conversation.id).where(~Conversation.id.in_(select(ConversationMember.conversation_id)))
    )).scalars().all())
    if orphan_conversation_ids:
        await db.execute(delete(Conversation).where(Conversation.id.in_(orphan_conversation_ids)))
    await db.commit()
    await manager.disconnect_user(user.id)


@router.get("/profile", response_model=UserMe)
async def profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/profile", response_model=UserMe)
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.username and data.username != user.username and await db.scalar(select(User.id).where(User.username == data.username)):
        raise HTTPException(409, "Username already exists")
    if data.email and data.email.lower() != user.email.lower() and await db.scalar(select(User.id).where(User.email == data.email.lower())):
        raise HTTPException(409, "Email already exists")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key == "avatar_url":
            if value: setattr(user, key, str(value))
        elif key == "email":
            if value: setattr(user, key, value.lower())
        elif key in ("phone_code", "phone"):
            pass  # handled together below
        else:
            setattr(user, key, value)
    if "phone_code" in updates or "phone" in updates:
        user.phone_code = data.phone_code or None
        user.phone = data.phone or None
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/profile/avatar", response_model=UploadResponse)
async def avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not (file.content_type or "").startswith("image/"): raise HTTPException(415, "Avatar must be an image")
    user.avatar_url = await storage.save(file, avatar=True)
    await db.commit()
    return UploadResponse(url=user.avatar_url)


@router.post("/media/upload", response_model=MediaUploadResponse, status_code=201)
async def upload_media(file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    url = await storage.save(file)
    item = MediaAttachment(
        uploader_id=user.id,
        name=(file.filename or "attachment")[:255],
        url=url,
        mime_type=file.content_type or "application/octet-stream",
        size=file.size or 0,
    )
    db.add(item); await db.commit(); await db.refresh(item)
    return item


@router.post("/calls/turn")
async def turn_credentials(user: User = Depends(get_current_user)):
    if not turn_configured():
        raise HTTPException(status_code=503, detail="TURN is not configured")
    return {"iceServers": await generate_turn_credentials()}


@router.get("/giphy/{kind}")
async def giphy_media(kind: str, q: str = Query(default="", max_length=100), user: User = Depends(get_current_user)):
    if kind not in {"gifs", "stickers"}: raise HTTPException(404, "Unknown media type")
    if not settings.giphy_api_key: raise HTTPException(503, "GIPHY is not configured")
    endpoint = f"{kind}/search" if q.strip() else f"{kind}/trending"
    params: dict[str, str | int] = {"limit": 24, "rating": "pg", "lang": "en"}
    if q.strip(): params["q"] = q.strip()
    try:
        payload = await asyncio.to_thread(_giphy_json, endpoint, params)
        return {"items": [_giphy_item(item, "gif" if kind == "gifs" else "sticker") for item in payload.get("data", [])]}
    except Exception as exc:
        raise HTTPException(502, "GIPHY is temporarily unavailable") from exc


@router.post("/media/giphy", response_model=MediaUploadResponse, status_code=201)
async def save_giphy_media(data: GiphyMediaCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    parsed = urlparse(data.url)
    if parsed.scheme != "https" or not (parsed.hostname or "").endswith("giphy.com"):
        raise HTTPException(422, "Invalid GIPHY media URL")
    item = MediaAttachment(
        uploader_id=user.id, name=f"GIPHY:{data.kind}:{(data.title or '').strip()[:200]}", url=data.url,
        mime_type="image/gif", size=0,
    )
    db.add(item); await db.commit(); await db.refresh(item)
    return item


async def search_result_for(db: AsyncSession, viewer_id: str, item: User) -> UserSearchResult:
    friend = await are_friends(db, viewer_id, item.id)
    blocked = bool(await db.scalar(select(Block.id).where(or_(and_(Block.blocker_id == viewer_id, Block.blocked_id == item.id), and_(Block.blocker_id == item.id, Block.blocked_id == viewer_id)))))
    request = await db.scalar(select(FriendRequest).where(or_((FriendRequest.requester_id == viewer_id) & (FriendRequest.recipient_id == item.id), (FriendRequest.requester_id == item.id) & (FriendRequest.recipient_id == viewer_id)), FriendRequest.status == "pending"))
    request_status = None
    request_id = None
    if request:
        request_status = "outgoing" if request.requester_id == viewer_id else "incoming"
        request_id = str(request.id)
    return UserSearchResult.model_validate(item).model_copy(update={"is_friend": friend, "request_status": request_status, "request_id": request_id, "is_blocked": blocked})


@router.get("/users/search", response_model=list[UserSearchResult])
async def search_users(q: str = Query(min_length=1, max_length=80), field: str = Query(default="username", pattern="^(username|email|number)$"), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pattern = f"%{q}%"
    query_text = q.strip().lstrip("+")
    conditions = [User.id != user.id]
    if field == "email":
        conditions.append(User.email.ilike(pattern))
    elif field == "number":
        conditions.append(or_(User.phone.ilike(f"%{query_text}%"), User.phone_code.ilike(f"%{query_text}%")))
    else:
        conditions.append(or_(User.username.ilike(pattern), User.display_name.ilike(pattern)))
    users = list((await db.scalars(select(User).where(*conditions).limit(20))).all())
    result = []
    for item in users:
        result.append(await search_result_for(db, user.id, item))
    return result


@router.get("/users/{user_id}", response_model=UserSearchResult)
async def get_user(user_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(User, user_id)
    if not item or item.id == user.id: raise HTTPException(404, "User not found")
    return await search_result_for(db, user.id, item)


@router.post("/friends/requests", response_model=FriendRequestView, status_code=201)
async def send_request(data: FriendRequestCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.user_id == user.id or not await db.get(User, data.user_id): raise HTTPException(404, "User not found")
    await ensure_not_blocked(db, user.id, data.user_id)
    existing = await db.scalar(select(FriendRequest).where(or_((FriendRequest.requester_id == user.id) & (FriendRequest.recipient_id == data.user_id), (FriendRequest.requester_id == data.user_id) & (FriendRequest.recipient_id == user.id))))
    if existing:
        if existing.status == "accepted": raise HTTPException(409, "Already friends")
        if existing.status == "pending":
            if existing.requester_id == data.user_id:
                existing.status = "accepted"; db.add(Friendship(user_low_id=min(user.id, data.user_id), user_high_id=max(user.id, data.user_id))); await db.commit()
                await manager.send_user(data.user_id, {"type": "friend.request.accepted", "requester_id": data.user_id, "recipient_id": user.id})
                offline = offline_recipients([data.user_id], user.id)
                if offline:
                    await push_to_users(db, offline, {
                        "notification": {"title": "Friend request accepted", "body": f"{user.display_name} accepted your friend request"},
                        "android": {"notification": {"channel_id": "messages"}},
                        "data": {"type": "friend.request.accepted", "requester_id": data.user_id, "recipient_id": user.id},
                    })
                return existing
            raise HTTPException(409, "Request already exists")
        if existing.requester_id == data.user_id and existing.status == "rejected":
            raise HTTPException(403, "Recipient rejected your request")
        existing.requester_id = user.id
        existing.recipient_id = data.user_id
        existing.status = "pending"
        existing.created_at = utcnow()
        db.add(existing); await db.commit(); await db.refresh(existing)
        await manager.send_user(data.user_id, {"type": "friend.request.received", "requester_id": user.id, "recipient_id": data.user_id})
        await push_friend_request(db, user, data.user_id)
        return existing
    item = FriendRequest(requester_id=user.id, recipient_id=data.user_id); db.add(item); await db.commit(); await db.refresh(item)
    await manager.send_user(data.user_id, {"type": "friend.request.received", "requester_id": user.id, "recipient_id": data.user_id})
    await push_friend_request(db, user, data.user_id)
    return item


@router.get("/friends/requests", response_model=list[FriendRequestView])
async def list_requests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return list((await db.scalars(select(FriendRequest).where(or_(FriendRequest.requester_id == user.id, FriendRequest.recipient_id == user.id)).order_by(FriendRequest.created_at.desc()))).all())


@router.post("/friends/requests/{request_id}/{action}", response_model=FriendRequestView)
async def request_action(request_id: str, action: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(FriendRequest, request_id)
    if not item or user.id not in (item.requester_id, item.recipient_id): raise HTTPException(404, "Request not found")
    if action == "accept" and item.recipient_id == user.id:
        item.status = "accepted"
        if not await are_friends(db, item.requester_id, item.recipient_id): db.add(Friendship(user_low_id=min(item.requester_id, item.recipient_id), user_high_id=max(item.requester_id, item.recipient_id)))
    elif action == "cancel" and item.requester_id == user.id: item.status = "cancelled"
    elif action == "reject" and item.recipient_id == user.id: item.status = "rejected"
    else: raise HTTPException(403, "Action not allowed")
    await db.commit()
    if action == "accept" and item.recipient_id == user.id:
        await manager.send_user(item.requester_id, {"type": "friend.request.accepted", "requester_id": item.requester_id, "recipient_id": item.recipient_id})
        offline = offline_recipients([item.requester_id], item.recipient_id)
        if offline:
            await push_to_users(db, offline, {
                "notification": {"title": "Friend request accepted", "body": f"{user.display_name} accepted your friend request"},
                "android": {"notification": {"channel_id": "messages"}},
                "data": {"type": "friend.request.accepted", "requester_id": item.requester_id, "recipient_id": item.recipient_id},
            })
    elif action == "cancel" and item.requester_id == user.id:
        await manager.send_user(item.recipient_id, {"type": "friend.request.cancelled", "requester_id": item.requester_id, "recipient_id": item.recipient_id})
    elif action == "reject" and item.recipient_id == user.id:
        await manager.send_user(item.requester_id, {"type": "friend.request.rejected", "requester_id": item.requester_id, "recipient_id": item.recipient_id})
    return item


@router.get("/friends", response_model=list[FriendView])
async def list_friends(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Friendship).where(or_(Friendship.user_low_id == user.id, Friendship.user_high_id == user.id)))).all()
    result = []
    for item in rows:
        friend_id = item.user_high_id if item.user_low_id == user.id else item.user_low_id
        friend = await db.get(User, friend_id)
        if not friend:
            continue
        remark = item.low_remark if item.user_low_id == user.id else item.high_remark
        result.append(FriendView.model_validate(friend).model_copy(update={"remark": remark}))
    return result


@router.patch("/friends/{friend_id}", response_model=FriendView)
async def set_friend_remark(friend_id: str, data: FriendRemarkUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.scalar(select(Friendship).where(Friendship.user_low_id == min(user.id, friend_id), Friendship.user_high_id == max(user.id, friend_id)))
    if not item:
        raise HTTPException(404, "Friendship not found")
    remark = data.remark.strip() if data.remark else None
    if item.user_low_id == user.id:
        item.low_remark = remark
    else:
        item.high_remark = remark
    await db.commit()
    friend = await db.get(User, friend_id)
    return FriendView.model_validate(friend).model_copy(update={"remark": remark})


@router.delete("/friends/{friend_id}", status_code=204)
async def remove_friend(friend_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.scalar(select(FriendRequest).where(FriendRequest.status == "accepted", or_((FriendRequest.requester_id == user.id) & (FriendRequest.recipient_id == friend_id), (FriendRequest.requester_id == friend_id) & (FriendRequest.recipient_id == user.id))))
    if not item: raise HTTPException(404, "Friendship not found")
    friendship = await db.scalar(select(Friendship).where(Friendship.user_low_id == min(user.id, friend_id), Friendship.user_high_id == max(user.id, friend_id)))
    await db.delete(item)
    if friendship: await db.delete(friendship)
    await db.commit()


@router.post("/blocks/{user_id}", status_code=204)
async def block_user(user_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id == user.id or not await db.get(User, user_id): raise HTTPException(404, "User not found")
    if not await db.scalar(select(Block.id).where(Block.blocker_id == user.id, Block.blocked_id == user_id)):
        db.add(Block(blocker_id=user.id, blocked_id=user_id)); await db.execute(delete(FriendRequest).where(or_(and_(FriendRequest.requester_id == user.id, FriendRequest.recipient_id == user_id), and_(FriendRequest.requester_id == user_id, FriendRequest.recipient_id == user.id)))); await db.execute(delete(Friendship).where(Friendship.user_low_id == min(user.id, user_id), Friendship.user_high_id == max(user.id, user_id)))
    await db.commit()


@router.delete("/blocks/{user_id}", status_code=204)
async def unblock_user(user_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.scalar(select(Block).where(Block.blocker_id == user.id, Block.blocked_id == user_id))
    if not item: raise HTTPException(404, "Block not found")
    await db.delete(item); await db.commit()


@router.post("/conversations", response_model=ConversationView)
async def create_conversation(data: ConversationCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    other = await db.get(User, data.user_id)
    if not other or other.id == user.id: raise HTTPException(404, "User not found")
    await ensure_not_blocked(db, user.id, other.id)
    key = pair_key(user.id, other.id); conversation = await db.scalar(select(Conversation).where(Conversation.direct_key == key))
    if not conversation:
        conversation = Conversation(direct_key=key); db.add(conversation); await db.flush(); db.add_all([ConversationMember(conversation_id=conversation.id, user_id=user.id), ConversationMember(conversation_id=conversation.id, user_id=other.id)]); await db.commit()
    return await conversation_view(db, conversation, user.id)


async def conversation_view(db: AsyncSession, conversation: Conversation, user_id: str) -> ConversationView:
    member = await require_member(db, conversation.id, user_id)
    base = ConversationView(id=conversation.id, kind=conversation.kind, members=await public_members(db, conversation.id),
                            unread_count=await unread_count(db, member), updated_at=conversation.updated_at)
    if conversation.kind == "group":
        group = await db.scalar(select(Group).where(Group.conversation_id == conversation.id))
        if group:
            base.title = group.name
            base.group = await group_summary(db, group, user_id)
    last = await db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation.id, Message.deleted_at.is_(None))
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    if last:
        base.last_message = await message_view(db, last)
    return base


@router.get("/conversations", response_model=list[ConversationView])
async def conversations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ids = (await db.scalars(select(ConversationMember.conversation_id).where(ConversationMember.user_id == user.id))).all()
    result = []
    for conversation in (await db.scalars(select(Conversation).where(Conversation.id.in_(ids)).order_by(Conversation.updated_at.desc()))).all():
        result.append(await conversation_view(db, conversation, user.id))
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=MessagePage)
async def list_messages(conversation_id: str, before: datetime | None = None, limit: int = Query(50, ge=1, le=100), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_member(db, conversation_id, user.id)
    query = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.desc()).limit(limit + 1)
    if before: query = query.where(Message.created_at < before)
    rows = list((await db.scalars(query)).all()); has_more = len(rows) > limit; rows = rows[:limit]
    return MessagePage(items=[await message_view(db, row) for row in reversed(rows)], next_cursor=rows[-1].created_at.isoformat() if has_more and rows else None)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageView, status_code=201)
async def send_message(conversation_id: str, data: MessageCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_member(db, conversation_id, user.id)
    conversation = await db.get(Conversation, conversation_id)
    if conversation.kind == "group":
        group = await db.scalar(select(Group).where(Group.conversation_id == conversation_id))
        if group:
            member = await require_group_member(db, group.id, user.id)
            settings = group_settings(group)
            is_privileged = member.role in ("owner", "admin")
            if settings.can_send == "admins" and not is_privileged:
                raise HTTPException(403, "Only admins can send messages in this group")
            if data.attachment_ids and settings.can_send_media == "admins" and not is_privileged:
                raise HTTPException(403, "Only admins can send media in this group")
    if not data.content and not data.attachment_ids: raise HTTPException(422, "Message or attachment required")
    if data.reply_to_id and not await db.scalar(select(Message.id).where(Message.id == data.reply_to_id, Message.conversation_id == conversation_id)): raise HTTPException(400, "Reply target not found")
    attachments = []
    if data.attachment_ids:
        attachments = list((await db.scalars(select(MediaAttachment).where(MediaAttachment.id.in_(data.attachment_ids), MediaAttachment.uploader_id == user.id, MediaAttachment.message_id.is_(None)))).all())
        if len(attachments) != len(set(data.attachment_ids)): raise HTTPException(400, "Invalid attachment")
    item = Message(conversation_id=conversation_id, sender_id=user.id, content=data.content, reply_to_id=data.reply_to_id); db.add(item); await db.flush()
    for attachment in attachments: attachment.message_id = item.id
    conversation = await db.get(Conversation, conversation_id); conversation.updated_at = utcnow(); await db.commit()
    result = await message_view(db, item)
    recipients = await member_ids(db, conversation_id)
    await manager.send_users(recipients, {"type": "message.created", "message": result.model_dump(mode="json")})
    offline = offline_recipients(recipients, user.id)
    if offline:
        preview = message_push_preview(item, attachments, "New message")
        if conversation.kind == "group":
            group = await db.scalar(select(Group).where(Group.conversation_id == conversation_id))
            title = group.name if group else "Group"
            body = f"{user.display_name}: {preview}"
        else:
            title = user.display_name
            body = preview
        await push_to_users(db, offline, {
            "notification": {"title": title, "body": body},
            "android": {"notification": {"channel_id": "messages"}},
            "data": {"type": "message", "conversation_id": conversation_id, "message_id": item.id},
        })
    return result


@router.patch("/messages/{message_id}", response_model=MessageView)
async def edit_message(message_id: str, data: MessageUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(Message, message_id)
    if not item or item.sender_id != user.id: raise HTTPException(404, "Message not found")
    item.content = data.content.strip(); item.edited_at = utcnow(); await db.commit(); result = await message_view(db, item)
    await manager.send_users(await member_ids(db, item.conversation_id), {"type": "message.updated", "message": result.model_dump(mode="json")})
    return result


@router.delete("/messages/{message_id}", response_model=MessageView)
async def delete_message(message_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(Message, message_id)
    if not item or item.sender_id != user.id: raise HTTPException(404, "Message not found")
    item.content = ""; item.deleted_at = utcnow(); await db.commit(); result = await message_view(db, item)
    await manager.send_users(await member_ids(db, item.conversation_id), {"type": "message.deleted", "message": result.model_dump(mode="json")})
    return result


@router.post("/messages/{message_id}/reactions", response_model=MessageView)
async def toggle_reaction(message_id: str, data: ReactionToggle, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(Message, message_id)
    if not item: raise HTTPException(404, "Message not found")
    await require_member(db, item.conversation_id, user.id)
    reaction = await db.scalar(select(Reaction).where(Reaction.message_id == message_id, Reaction.user_id == user.id, Reaction.emoji == data.emoji))
    if reaction: await db.delete(reaction)
    else: db.add(Reaction(message_id=message_id, user_id=user.id, emoji=data.emoji))
    await db.commit(); result = await message_view(db, item)
    await manager.send_users(await member_ids(db, item.conversation_id), {"type": "reaction.updated", "message": result.model_dump(mode="json")})
    return result


@router.post("/conversations/{conversation_id}/read", status_code=204)
async def mark_read(conversation_id: str, data: ReadRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    member = await require_member(db, conversation_id, user.id)
    message = await db.scalar(select(Message).where(Message.id == data.message_id, Message.conversation_id == conversation_id))
    if not message: raise HTTPException(404, "Message not found")
    if message.sender_id == user.id: return
    member.last_read_at = message.created_at
    if not await db.scalar(select(MessageRead.id).where(MessageRead.message_id == message.id, MessageRead.user_id == user.id)): db.add(MessageRead(message_id=message.id, user_id=user.id))
    await db.commit(); await manager.send_users(await member_ids(db, conversation_id), {"type": "message.read", "conversation_id": conversation_id, "user_id": user.id, "message_id": message.id}, exclude=user.id)


@router.post("/devices", status_code=204)
async def register_device(data: DeviceCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.scalar(select(Device.id).where(Device.user_id == user.id, Device.push_token == data.push_token)):
        db.add(Device(user_id=user.id, push_token=data.push_token, platform=data.platform)); await db.commit()


@router.get("/calls/pending")
async def pending_call(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(CallOffer).where(CallOffer.created_at < utcnow() - timedelta(seconds=90)))
    await db.commit()
    member_conversation_ids = (await db.scalars(select(ConversationMember.conversation_id).where(ConversationMember.user_id == user.id))).all()
    if not member_conversation_ids:
        return None
    offer = await db.scalar(select(CallOffer).where(
        CallOffer.conversation_id.in_(member_conversation_ids),
        CallOffer.caller_id != user.id,
        CallOffer.consumed.is_(False),
    ).order_by(CallOffer.created_at.desc()).limit(1))
    if not offer:
        return None
    offer.consumed = True
    await db.commit()
    return {"conversation_id": offer.conversation_id, "caller_id": offer.caller_id, "sdp": offer.sdp, "kind": offer.kind}


@router.get("/messages/search", response_model=list[MessageView])
async def search_messages(q: str = Query(min_length=1, max_length=100), conversation_id: str | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Message).join(ConversationMember, ConversationMember.conversation_id == Message.conversation_id).where(ConversationMember.user_id == user.id, Message.content.ilike(f"%{q}%")).order_by(Message.created_at.desc()).limit(50)
    if conversation_id: query = query.where(Message.conversation_id == conversation_id)
    return [await message_view(db, item) for item in (await db.scalars(query)).all()]


@router.get("/users/{user_id}/presence", response_model=UserPublic)
async def presence(user_id: str, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(User, user_id)
    if not item: raise HTTPException(404, "User not found")
    return item


@router.get("/blocks", response_model=list[UserPublic])
async def list_blocks(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    users = list((await db.scalars(select(User).join(Block, Block.blocked_id == User.id).where(Block.blocker_id == user.id).order_by(User.display_name))).all())
    return users


@router.post("/groups", response_model=GroupView, status_code=201)
async def create_group(data: GroupCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    member_ids = list(dict.fromkeys([user.id, *data.member_ids]))
    for member_id in member_ids:
        if not await db.get(User, member_id): raise HTTPException(400, "Unknown user")
        await ensure_not_blocked(db, user.id, member_id)
    conversation = Conversation(kind="group"); db.add(conversation); await db.flush()
    group = Group(name=data.name, description=data.description, conversation_id=conversation.id, owner_id=user.id)
    set_group_settings(group, None)
    db.add(group); await db.flush()
    for member_id in member_ids:
        db.add(GroupMember(group_id=group.id, user_id=member_id, role="owner" if member_id == user.id else "member"))
        db.add(ConversationMember(conversation_id=conversation.id, user_id=member_id))
    await db.commit()
    return await group_view(db, group, user.id)


@router.get("/groups", response_model=list[GroupView])
async def my_groups(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    groups = list((await db.scalars(select(Group).join(GroupMember, GroupMember.group_id == Group.id).where(GroupMember.user_id == user.id).order_by(Group.updated_at.desc()))).all())
    return [await group_view(db, group, user.id) for group in groups]


@router.get("/groups/search", response_model=list[GroupView])
async def search_groups(q: str = Query(min_length=1, max_length=80), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pattern = f"%{q}%"
    groups = list((await db.scalars(select(Group).where(Group.name.ilike(pattern)).limit(20))).all())
    return [await group_view(db, group, user.id) for group in groups]


@router.get("/groups/{group_id}", response_model=GroupView)
async def group_detail(group_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    await require_group_member(db, group.id, user.id)
    return await group_view(db, group, user.id)


@router.patch("/groups/{group_id}", response_model=GroupView)
async def update_group(group_id: str, data: GroupUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    if data.settings is not None:
        await require_group_role(db, group.id, user.id, ("owner", "admin"))
        set_group_settings(group, data.settings)
    elif data.customization is not None:
        await require_group_role(db, group.id, user.id, ("owner", "admin"))
        set_group_customization(group, data.customization)
    else:
        current = group_settings(group)
        if current.can_edit_info == "admins":
            await require_group_role(db, group.id, user.id, ("owner", "admin"))
        else:
            await require_group_member(db, group.id, user.id)
    if data.name is not None: group.name = data.name
    if data.description is not None: group.description = data.description
    if data.avatar_url is not None: group.avatar_url = str(data.avatar_url)
    group.updated_at = utcnow(); await db.commit(); await db.refresh(group)
    result = await group_view(db, group, user.id)
    await manager.send_users(await member_ids(db, group.conversation_id), {"type": "group.updated", "group": result.model_dump(mode="json")}, exclude=user.id)
    return result


@router.post("/groups/{group_id}/members", response_model=GroupView)
async def add_group_members(group_id: str, data: GroupMemberAdd, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    current = group_settings(group)
    if current.can_add_members == "admins":
        await require_group_role(db, group.id, user.id, ("owner", "admin"))
    else:
        await require_group_member(db, group.id, user.id)
    for member_id in data.user_ids:
        if not await db.get(User, member_id): raise HTTPException(400, "Unknown user")
        await ensure_not_blocked(db, user.id, member_id)
    existing = set((await db.scalars(select(GroupMember.user_id).where(GroupMember.group_id == group.id))).all())
    for member_id in data.user_ids:
        if member_id in existing: continue
        db.add(GroupMember(group_id=group.id, user_id=member_id))
        existing.add(member_id)
    group.updated_at = utcnow(); await db.commit()
    await sync_group_conversation_members(db, group); await db.commit()
    result = await group_view(db, group, user.id)
    await manager.send_users(await member_ids(db, group.conversation_id), {"type": "group.updated", "group": result.model_dump(mode="json")}, exclude=user.id)
    return result


@router.delete("/groups/{group_id}/members/{user_id}", response_model=GroupView)
async def remove_group_member(group_id: str, user_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    target = await require_group_member(db, group.id, user_id)
    if user.id == target.user_id:
        if target.role == "owner": raise HTTPException(403, "Owner cannot leave; delete the group instead")
    else:
        await require_group_role(db, group.id, user.id, ("owner", "admin"))
    conversation_member = await db.scalar(select(ConversationMember).where(ConversationMember.conversation_id == group.conversation_id, ConversationMember.user_id == target.user_id))
    await db.delete(target)
    if conversation_member: await db.delete(conversation_member)
    group.updated_at = utcnow(); await db.commit()
    result = await group_view(db, group, user.id)
    await manager.send_users(await member_ids(db, group.conversation_id), {"type": "group.updated", "group": result.model_dump(mode="json")})
    await manager.send_user(target.user_id, {"type": "group.member.removed", "group_id": group.id, "conversation_id": group.conversation_id, "user_id": target.user_id})
    return result


@router.patch("/groups/{group_id}/members/{user_id}/role", response_model=GroupView)
async def change_member_role(group_id: str, user_id: str, data: GroupMemberRole, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    await require_group_role(db, group.id, user.id, ("owner",))
    target = await require_group_member(db, group.id, user_id)
    if target.role == "owner": raise HTTPException(403, "Cannot change the owner's role")
    target.role = data.role; group.updated_at = utcnow(); await db.commit()
    result = await group_view(db, group, user.id)
    await manager.send_users(await member_ids(db, group.conversation_id), {"type": "group.updated", "group": result.model_dump(mode="json")})
    return result


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(group_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    await require_group_role(db, group.id, user.id, ("owner",))
    conversation_id = group.conversation_id
    member_ids_of_group = await member_ids(db, conversation_id)
    await db.execute(delete(ConversationMember).where(ConversationMember.conversation_id == conversation_id))
    await db.delete(group)
    conversation = await db.get(Conversation, conversation_id)
    if conversation: await db.delete(conversation)
    await db.commit()
    await manager.send_users(member_ids_of_group, {"type": "group.deleted", "group_id": group_id, "conversation_id": conversation_id})


@router.post("/groups/{group_id}/applications", response_model=GroupApplicationView, status_code=201)
async def apply_to_group(group_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    if await db.scalar(select(GroupMember.id).where(GroupMember.group_id == group.id, GroupMember.user_id == user.id)):
        raise HTTPException(409, "Already a member")
    await ensure_not_blocked(db, group.owner_id, user.id)
    existing = await db.scalar(select(GroupApplication).where(GroupApplication.group_id == group.id, GroupApplication.applicant_id == user.id))
    if existing:
        if existing.status == "pending": raise HTTPException(409, "Application already pending")
        existing.status = "pending"; existing.updated_at = utcnow()
    else:
        existing = GroupApplication(group_id=group.id, applicant_id=user.id); db.add(existing)
    await db.commit(); await db.refresh(existing)
    return GroupApplicationView(id=existing.id, group_id=group.id, group_name=group.name, applicant=user, status=existing.status, created_at=existing.created_at)


@router.get("/groups/{group_id}/applications", response_model=list[GroupApplicationView])
async def list_group_applications(group_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    await require_group_role(db, group.id, user.id, ("owner", "admin"))
    rows = (await db.scalars(select(GroupApplication).where(GroupApplication.group_id == group.id, GroupApplication.status == "pending").order_by(GroupApplication.created_at.desc()))).all()
    result = []
    for item in rows:
        applicant = await db.get(User, item.applicant_id)
        result.append(GroupApplicationView(id=item.id, group_id=group.id, group_name=group.name, applicant=applicant, status=item.status, created_at=item.created_at))
    return result


@router.post("/groups/{group_id}/applications/{application_id}/{action}", response_model=GroupApplicationView)
async def group_application_action(group_id: str, application_id: str, action: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await require_group(db, group_id)
    await require_group_role(db, group.id, user.id, ("owner", "admin"))
    item = await db.get(GroupApplication, application_id)
    if not item or item.group_id != group.id: raise HTTPException(404, "Application not found")
    if action not in ("accept", "reject"): raise HTTPException(400, "Action must be accept or reject")
    item.status = "accepted" if action == "accept" else "rejected"; item.updated_at = utcnow()
    if action == "accept" and not await db.scalar(select(GroupMember.id).where(GroupMember.group_id == group.id, GroupMember.user_id == item.applicant_id)):
        db.add(GroupMember(group_id=group.id, user_id=item.applicant_id))
        await db.commit(); await sync_group_conversation_members(db, group); await db.commit()
        result = await group_view(db, group, user.id)
        await manager.send_users(await member_ids(db, group.conversation_id), {"type": "group.updated", "group": result.model_dump(mode="json")})
    else:
        await db.commit()
    applicant = await db.get(User, item.applicant_id)
    view = GroupApplicationView(id=item.id, group_id=group.id, group_name=group.name, applicant=applicant, status=item.status, created_at=item.created_at)
    if action == "accept":
        await manager.send_user(item.applicant_id, {"type": "group.member.added", "group_id": group.id, "conversation_id": group.conversation_id, "user_id": item.applicant_id})
    return view


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        user, db = await websocket_user(websocket, token)
    except Exception:
        await websocket.close(code=1008); return
    await manager.connect(user.id, websocket); user.is_online = True; await db.commit()
    await manager.send_users(list(manager.connections), {"type": "presence.updated", "user_id": user.id, "is_online": True}, exclude=user.id)
    try:
        while True:
            event = await websocket.receive_json()
            kind = event.get("type")
            if kind in ("typing.start", "typing.stop"):
                conversation_id = event.get("conversation_id")
                await require_member(db, conversation_id, user.id)
                await manager.send_users(await member_ids(db, conversation_id), {"type": kind, "conversation_id": conversation_id, "user_id": user.id}, exclude=user.id)
            elif kind in ("call.offer", "call.answer", "call.ice", "call.hangup", "call.decline"):
                conversation_id = event.get("conversation_id")
                if not conversation_id:
                    await websocket.send_json({"type": "error", "detail": "conversation_id required"}); continue
                await require_member(db, conversation_id, user.id)
                relay: dict = {"type": kind, "conversation_id": conversation_id, "user_id": user.id}
                if kind in ("call.offer", "call.answer"):
                    relay["sdp"] = event.get("sdp")
                    if kind == "call.offer":
                        relay["kind"] = event.get("kind") or "audio"
                elif kind == "call.ice":
                    relay["candidate"] = event.get("candidate")
                elif kind == "call.decline":
                    relay["reason"] = event.get("reason") or "declined"
                members = await member_ids(db, conversation_id)
                await manager.send_users(members, relay, exclude=user.id)
                if kind == "call.offer":
                    offer_kind = event.get("kind") or "audio"
                    db.add(CallOffer(conversation_id=conversation_id, caller_id=user.id, sdp=event.get("sdp") or "", kind=offer_kind))
                    await db.commit()
                    offline = offline_recipients(members, user.id)
                    if offline:
                        await push_to_users(db, offline, {
                            "notification": {"title": "Incoming call", "body": user.display_name},
                            "android": {"notification": {"channel_id": "calls"}},
                            "data": {"type": "call.offer", "conversation_id": conversation_id, "user_id": user.id, "kind": offer_kind, "categoryId": "call"},
                        }, high_priority=True)
                elif kind in ("call.answer", "call.hangup", "call.decline"):
                    await db.execute(update(CallOffer).where(CallOffer.conversation_id == conversation_id, CallOffer.consumed.is_(False)).values(consumed=True))
                    await db.commit()
            elif kind == "ping": await websocket.send_json({"type": "pong"})
            else: await websocket.send_json({"type": "error", "detail": "Unsupported event"})
    except WebSocketDisconnect:
        if manager.disconnect(user.id, websocket):
            user.is_online = False; user.last_seen_at = utcnow(); await db.commit()
            await manager.send_users(list(manager.connections), {"type": "presence.updated", "user_id": user.id, "is_online": False, "last_seen_at": user.last_seen_at.isoformat()}, exclude=user.id)
    finally:
        await db.close()
