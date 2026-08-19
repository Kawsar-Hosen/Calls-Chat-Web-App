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
from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (create_access_token, create_refresh_token, decode_token, hash_password,
                      token_digest, verify_password)
from app.config import settings
from app.db import get_db
from app.dependencies import get_current_session, get_current_user, get_admin_user, websocket_user
from app.email import generate_deletion_code, mask_email, render_deletion_email, render_password_reset_email, send_email
from app.models import (AccountDeletion, AuthSession, Block, CallOffer, Conversation, ConversationMember, Device,
                        Follow, FriendRequest, Friendship, Group, GroupApplication, GroupMember, MediaAttachment,
                         Message, MessageRead, Notification, NotificationPreference, PasswordReset, Post, PostBookmark, PostComment, PostLike,
                         PostMedia, PostShare, Reaction, Report, SocialLink, Story, StoryView, TelegramCode, User, CommentLike, BlogPost,
                         VerificationRequest, new_id, utcnow)
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
                password_hash=hash_password(data.password), date_of_birth=data.date_of_birth, gender=data.gender,
                role="super_admin" if data.email.lower() in [e.lower() for e in settings.admin_emails] else "user")
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


# ── Facebook Auth ─────────────────────────────────────────────


@router.post("/auth/facebook", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit)])
async def facebook_auth(data: FacebookAuthRequest, request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.facebook_app_id:
        raise HTTPException(503, "Facebook auth is not configured")

    def _fetch_fb_user():
        import urllib.request, urllib.parse
        fields = "id,name,email,picture.width(200).height(200)"
        url = f"https://graph.facebook.com/me?fields={fields}&access_token={urllib.parse.quote(data.access_token)}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())

    try:
        fb = await asyncio.to_thread(_fetch_fb_user)
    except Exception:
        raise HTTPException(400, "Invalid Facebook access token")

    fb_id = str(fb.get("id") or "")
    if not fb_id:
        raise HTTPException(400, "Could not retrieve Facebook user info")

    email = str(fb.get("email") or "").strip().lower() or None
    display_name = str(fb.get("name") or "").strip()[:80] or f"FB User {fb_id[-4:]}"
    picture_data = fb.get("picture", {}).get("data", {})
    avatar_url = str(picture_data.get("url") or "").strip() or None
    if avatar_url and not avatar_url.startswith("https://"):
        avatar_url = None

    user = await db.scalar(select(User).where(User.facebook_id == fb_id))
    if not user and email:
        user = await db.scalar(select(User).where(User.email == email))
    if not user:
        username = await _available_username(db, f"fb_{display_name.lower().replace(' ', '')[:12]}")
        user = User(
            facebook_id=fb_id,
            email=email,
            username=username,
            display_name=display_name,
            password_hash=hash_password(secrets.token_urlsafe(48)),
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.facebook_id:
            user.facebook_id = fb_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

    tokens = await issue_tokens(db, user, data.device_name, request)
    await db.commit()
    return AuthResponse(**tokens.model_dump(), user=user)


# ── Telegram Auth ──────────────────────────────────────────────


class TelegramStartRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20)


class TelegramVerifyRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    code: str = Field(min_length=6, max_length=6)


@router.post("/auth/telegram/start")
async def telegram_start(data: TelegramStartRequest, db: AsyncSession = Depends(get_db)):
    if not settings.telegram_bot_token:
        raise HTTPException(503, "Telegram auth is not configured")

    code = f"{secrets.randbelow(1000000):06d}"
    expires = utcnow() + timedelta(minutes=5)
    phone_digits = "".join(c for c in data.phone if c.isdigit())

    def _fetch_chat_id():
        import urllib.request, urllib.parse
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates?limit=20"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())

    def _send_code(cid: int, txt: str):
        import urllib.request, urllib.parse
        params = urllib.parse.urlencode({"chat_id": cid, "text": txt, "parse_mode": "HTML"})
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage?{params}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())

    chat_id = None
    try:
        result = await asyncio.to_thread(_fetch_chat_id)
        if result.get("ok"):
            for update in reversed(result.get("result", [])):
                msg = update.get("message")
                if msg and msg.get("text", "").strip().lower() in ("/start", "start"):
                    chat_id = msg.get("from", {}).get("id")
                    if chat_id:
                        break
    except Exception:
        pass

    if not chat_id:
        raise HTTPException(400, "Could not find your Telegram chat. Please open @xyteee_auth_bot on Telegram and send /start first.")

    db.add(TelegramCode(phone=phone_digits, code=code, expires_at=expires))
    await db.commit()

    try:
        result = await asyncio.to_thread(_send_code, chat_id, f"🔐 Your XYTEEE verification code:\n\n<code>{code}</code>\n\n⏱ Expires in 5 minutes. Do not share it with anyone.")
        if not result.get("ok"):
            raise HTTPException(400, "Failed to send code via Telegram")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Failed to send code via Telegram")

    return {"success": True, "message": "Code sent via Telegram"}


@router.post("/auth/telegram/verify")
async def telegram_verify(data: TelegramVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    now = utcnow()
    phone_digits = "".join(c for c in data.phone if c.isdigit())
    code_row = await db.scalar(
        select(TelegramCode).where(
            TelegramCode.phone == phone_digits,
            TelegramCode.code == data.code,
            TelegramCode.expires_at > now,
        ).order_by(TelegramCode.created_at.desc())
    )
    if not code_row:
        raise HTTPException(400, "Invalid or expired code")

    await db.delete(code_row)
    await db.execute(delete(TelegramCode).where(TelegramCode.phone == phone_digits, TelegramCode.expires_at < now))

    user = await db.scalar(select(User).where(User.phone == phone_digits))
    if not user:
        username = await _available_username(db, f"tg_{phone_digits[-6:]}")
        user = User(
            phone=phone_digits,
            phone_code=data.phone[:4] if data.phone.startswith("+") else "",
            email=f"{username}@telegram.xyteee",
            username=username,
            display_name=f"TG User {phone_digits[-4:]}",
            password_hash=hash_password(secrets.token_urlsafe(48)),
        )
        db.add(user)
        await db.flush()

    tokens = await issue_tokens(db, user, "Telegram Auth", request)
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
async def profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> User:
    if user.is_verified and user.verified_until and user.verified_until < utcnow():
        user.is_verified = False
        user.verified_category = None
        await db.commit()
        await db.refresh(user)
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


@router.post("/profile/cover", response_model=UploadResponse)
async def cover_photo(file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not (file.content_type or "").startswith("image/"): raise HTTPException(415, "Cover must be an image")
    old = user.cover_url
    user.cover_url = await storage.save(file)
    await db.commit()
    if old: await storage.delete(old)
    return UploadResponse(url=user.cover_url)


@router.delete("/profile/avatar")
async def delete_avatar(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    old = user.avatar_url
    user.avatar_url = None
    await db.commit()
    if old: await storage.delete(old)
    return {"ok": True}


@router.delete("/profile/cover")
async def delete_cover(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    old = user.cover_url
    user.cover_url = None
    await db.commit()
    if old: await storage.delete(old)
    return {"ok": True}


# ── Social Links ───────────────────────────────────────────────

from app.models import SocialLink as SocialLinkModel


@router.get("/profile/social-links", response_model=SocialLinkListPage)
async def list_social_links(user: User = Depends(get_current_user)):
    return SocialLinkListPage(items=[], next_cursor=None)


@router.get("/users/{user_id}/social-links", response_model=SocialLinkListPage)
async def get_user_social_links(user_id: str, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(SocialLinkModel).where(SocialLinkModel.user_id == user_id).order_by(SocialLinkModel.sort_order))).scalars().all()
    return SocialLinkListPage(items=[SocialLinkView(id=r.id, platform=r.platform, username=r.username, url=r.url, sort_order=r.sort_order) for r in rows])


@router.post("/profile/social-links", response_model=SocialLinkView, status_code=201)
async def create_social_link(data: SocialLinkCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(SocialLinkModel).where(SocialLinkModel.user_id == user.id, SocialLinkModel.platform == data.platform))
    if existing:
        existing.username = data.username
        existing.url = data.url
        existing.sort_order = data.sort_order
        await db.commit(); await db.refresh(existing)
        return SocialLinkView(id=existing.id, platform=existing.platform, username=existing.username, url=existing.url, sort_order=existing.sort_order)
    link = SocialLinkModel(id=new_id(), user_id=user.id, platform=data.platform, username=data.username, url=data.url, sort_order=data.sort_order)
    db.add(link); await db.commit(); await db.refresh(link)
    return SocialLinkView(id=link.id, platform=link.platform, username=link.username, url=link.url, sort_order=link.sort_order)


@router.delete("/profile/social-links/{link_id}")
async def delete_social_link(link_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    link = await db.get(SocialLinkModel, link_id)
    if not link or link.user_id != user.id: raise HTTPException(404, "Not found")
    await db.delete(link); await db.commit()
    return {"ok": True}


# ── Location Search ────────────────────────────────────────────

@router.get("/locations/search")
async def search_locations(q: str = Query(..., min_length=2, max_length=100)):
    from urllib.request import urlopen, Request
    from urllib.parse import quote, urlencode
    try:
        params = urlencode({"q": q, "format": "json", "limit": 8, "addressdetails": 1})
        req = Request(f"https://nominatim.openstreetmap.org/search?{params}", headers={"User-Agent": "XYTEEE/1.0"})
        with urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read())
        return [LocationResult(display_name=item.get("display_name", ""), lat=float(item.get("lat", 0)), lon=float(item.get("lon", 0))) for item in data[:8]]
    except Exception:
        return []


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


# ── Notification Preferences ──────────────────────────────────────


@router.get("/settings/notifications", response_model=NotificationPreferenceView)
async def get_notification_prefs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    prefs = await db.get(NotificationPreference, user.id)
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.patch("/settings/notifications", response_model=NotificationPreferenceView)
async def update_notification_prefs(data: NotificationPreferenceUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    prefs = await db.get(NotificationPreference, user.id)
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)
    await db.commit()
    await db.refresh(prefs)
    return prefs


# ── Change Password ──────────────────────────────────────────────


@router.post("/auth/change-password", status_code=204)
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Incorrect password")
    user.password_hash = hash_password(data.new_password)
    await db.commit()


# ── Change Email ─────────────────────────────────────────────────


@router.post("/auth/change-email", status_code=204)
async def change_email(data: ChangeEmailRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(400, "Incorrect password")
    new = data.new_email.lower().strip()
    if new == user.email:
        raise HTTPException(400, "New email is the same as current")
    if await db.scalar(select(User.id).where(User.email == new)):
        raise HTTPException(409, "Email already in use")
    user.email = new
    await db.commit()


# ── Notifications ────────────────────────────────────────────────


@router.get("/notifications", response_model=list[NotificationView])
async def list_notifications(limit: int = Query(default=30, le=100), cursor: str | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(limit)
    if cursor:
        cur = await db.get(Notification, cursor)
        if cur:
            q = q.where(Notification.created_at < cur.created_at)
    rows = (await db.scalars(q)).all()
    from_ids = list({r.from_user_id for r in rows if r.from_user_id})
    users_map: dict[str, User] = {}
    if from_ids:
        from_users = (await db.scalars(select(User).where(User.id.in_(from_ids)))).all()
        users_map = {u.id: u for u in from_users}
    result = []
    for r in rows:
        fu = users_map.get(r.from_user_id) if r.from_user_id else None
        result.append(NotificationView(
            id=r.id, from_user_id=r.from_user_id,
            from_user_name=fu.display_name if fu else None,
            from_user_avatar=fu.avatar_url if fu else None,
            from_user_is_verified=fu.is_verified if fu else False,
            from_user_verified_category=fu.verified_category if fu else None,
            from_user_verified_at=fu.verified_at if fu else None,
            type=r.type, target_type=r.target_type, target_id=r.target_id,
            body=r.body, is_read=r.is_read, created_at=r.created_at,
        ))
    return result


@router.get("/notifications/count")
async def notification_count(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    count = (await db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.is_read == False))) or 0
    return {"count": int(count)}


@router.post("/notifications/read")
async def mark_notifications_read(data: dict | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ids: list[str] | None = (data or {}).get("ids")
    if ids:
        await db.execute(update(Notification).where(Notification.id.in_(ids), Notification.user_id == user.id).values(is_read=True))
    else:
        await db.execute(update(Notification).where(Notification.user_id == user.id, Notification.is_read == False).values(is_read=True))
    await db.commit()
    return {"ok": True}


@router.delete("/notifications", status_code=204)
async def clear_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Notification).where(Notification.user_id == user.id))
    await db.commit()


# ── Unified Search ───────────────────────────────────────────────


@router.get("/search")
async def unified_search(q: str = Query(min_length=1, max_length=80), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pattern = f"%{q}%"
    user_rows = list((await db.scalars(select(User).where(or_(User.username.ilike(pattern), User.display_name.ilike(pattern)), User.id != user.id).limit(10))).all())
    users = []
    for u in user_rows:
        uid1, uid2 = sorted([user.id, u.id])
        friend = await db.scalar(select(Friendship.id).where(Friendship.user_low_id == uid1, Friendship.user_high_id == uid2))
        req = await db.scalar(select(FriendRequest.id).where(or_((FriendRequest.requester_id == user.id) & (FriendRequest.recipient_id == u.id), (FriendRequest.requester_id == u.id) & (FriendRequest.recipient_id == user.id)), FriendRequest.status == "pending"))
        blocked = await db.scalar(select(Block.blocked_id).where(Block.blocker_id == user.id, Block.blocked_id == u.id))
        r = UserSearchResult.model_validate(u).model_copy(update={"is_friend": bool(friend), "request_status": "accepted" if friend else "pending" if req else None, "request_id": req, "is_blocked": bool(blocked)})
        users.append(r)
    post_rows = list((await db.scalars(select(Post).where(Post.content.ilike(pattern), Post.author_id != user.id, Post.deleted_at.is_(None)).order_by(Post.created_at.desc()).limit(10))).all())
    posts = []
    for p in post_rows:
        posts.append({"id": p.id, "body": p.content, "author_id": p.author_id, "created_at": p.created_at.isoformat()})
    return {"users": users, "posts": posts}


@router.post("/reports", status_code=201)
async def create_report(data: ReportRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    db.add(Report(reporter_id=user.id, type=data.type, target_id=data.target_id, reason=data.reason, details=data.details))
    await db.commit()


# ── Permanent Data Delete ───────────────────────────────────────


@router.get("/settings/data/usage")
async def get_data_usage(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import Story
    post_count = (await db.scalar(select(func.count(Post.id)).where(Post.author_id == user.id))) or 0
    story_count = (await db.scalar(select(func.count(Story.id)).where(Story.user_id == user.id))) or 0
    msg_count = (await db.scalar(select(func.count(Message.id)).where(Message.sender_id == user.id))) or 0
    media_count = (await db.scalar(select(func.count(MediaAttachment.id)).where(MediaAttachment.uploader_id == user.id))) or 0
    media_size = (await db.scalar(select(func.coalesce(func.sum(MediaAttachment.size), 0)).where(MediaAttachment.uploader_id == user.id))) or 0
    return {"posts": int(post_count), "stories": int(story_count), "messages": int(msg_count), "media": int(media_count), "media_bytes": int(media_size)}


@router.delete("/settings/data/posts", status_code=204)
async def delete_all_posts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import PostMedia, PostLike, PostComment, PostShare, PostBookmark
    post_ids = list((await db.scalars(select(Post.id).where(Post.author_id == user.id))).all())
    if post_ids:
        for model in [PostMedia, PostLike, PostComment, PostShare, PostBookmark]:
            await db.execute(delete(model).where(model.post_id.in_(post_ids)))
        await db.execute(delete(Post).where(Post.id.in_(post_ids)))
        await db.commit()


@router.delete("/settings/data/stories", status_code=204)
async def delete_all_stories(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import StoryView, StoryReaction, StoryReply, StoryHighlight, StoryHighlightItem
    story_ids = list((await db.scalars(select(Story.id).where(Story.user_id == user.id))).all())
    if story_ids:
        for model in [StoryView, StoryReaction, StoryReply]:
            await db.execute(delete(model).where(model.story_id.in_(story_ids)))
        await db.execute(delete(StoryHighlightItem).where(StoryHighlightItem.story_id.in_(story_ids)))
        await db.execute(delete(Story).where(Story.id.in_(story_ids)))
        await db.commit()


@router.delete("/settings/data/messages", status_code=204)
async def delete_all_messages(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import MessageRead, Reaction
    msg_ids = list((await db.scalars(select(Message.id).where(Message.sender_id == user.id))).all())
    if msg_ids:
        for model in [MessageRead, Reaction]:
            await db.execute(delete(model).where(model.message_id.in_(msg_ids)))
        await db.execute(delete(MediaAttachment).where(MediaAttachment.message_id.in_(msg_ids)))
        await db.execute(delete(Message).where(Message.id.in_(msg_ids)))
        await db.commit()


@router.delete("/settings/data/media", status_code=204)
async def delete_all_media(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = list((await db.scalars(select(MediaAttachment).where(MediaAttachment.uploader_id == user.id))).all())
    for item in items:
        try: await asyncio.to_thread(storage.delete, item.url)
        except: pass
    await db.execute(delete(MediaAttachment).where(MediaAttachment.uploader_id == user.id))
    await db.commit()


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


# ══════════════════════════════════════════════════════════════
#  PUBLIC ENDPOINTS (No auth required)
# ══════════════════════════════════════════════════════════════

public = APIRouter()


@public.get("/public/users/{username}", response_model=PublicProfile)
async def public_profile(username: str, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == username, User.is_banned == False))
    if not user:
        raise HTTPException(404, "User not found")
    follower = await db.scalar(select(func.count()).select_from(Follow).where(Follow.following_id == user.id))
    following = await db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == user.id))
    posts = await db.scalar(select(func.count()).select_from(Post).where(Post.author_id == user.id, Post.deleted_at.is_(None), Post.visibility == "public"))
    return PublicProfile(
        id=user.id, username=user.username, display_name=user.display_name,
        bio=user.bio, avatar_url=user.avatar_url, cover_url=user.cover_url,
        custom_status=user.custom_status, accent_color=user.accent_color,
        location=user.location, website=user.website, is_verified=user.is_verified,
        created_at=user.created_at, follower_count=follower or 0,
        following_count=following or 0, post_count=posts or 0,
    )


@public.get("/public/users/{username}/posts")
async def public_user_posts(username: str, limit: int = Query(20, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == username, User.is_banned == False))
    if not user:
        raise HTTPException(404, "User not found")
    rows = (await db.execute(
        select(Post).where(Post.author_id == user.id, Post.deleted_at.is_(None), Post.visibility == "public")
        .order_by(Post.created_at.desc()).limit(limit)
    )).scalars().all()
    items = []
    for p in rows:
        media = (await db.execute(select(PostMedia).where(PostMedia.post_id == p.id).order_by(PostMedia.sort_order))).scalars().all()
        likes = await db.scalar(select(func.count()).select_from(PostLike).where(PostLike.post_id == p.id))
        comments = await db.scalar(select(func.count()).select_from(PostComment).where(PostComment.post_id == p.id, PostComment.deleted_at.is_(None)))
        shares = await db.scalar(select(func.count()).select_from(PostShare).where(PostShare.post_id == p.id))
        items.append(PublicPost(
            id=p.id, author=UserPublic.model_validate(user), content=p.content,
            media=[PostMediaView.model_validate(m) for m in media],
            like_count=likes or 0, comment_count=comments or 0, share_count=shares or 0,
            created_at=p.created_at,
        ))
    return {"items": items}


@public.get("/public/posts/{post_id}")
async def public_post(post_id: str, db: AsyncSession = Depends(get_db)):
    post = await db.scalar(select(Post).where(Post.id == post_id, Post.deleted_at.is_(None), Post.visibility == "public"))
    if not post:
        raise HTTPException(404, "Post not found")
    author = await db.get(User, post.author_id)
    if not author or author.is_banned:
        raise HTTPException(404, "Post not found")
    media = (await db.execute(select(PostMedia).where(PostMedia.post_id == post.id).order_by(PostMedia.sort_order))).scalars().all()
    likes = await db.scalar(select(func.count()).select_from(PostLike).where(PostLike.post_id == post.id))
    comments = await db.scalar(select(func.count()).select_from(PostComment).where(PostComment.post_id == post.id, PostComment.deleted_at.is_(None)))
    shares = await db.scalar(select(func.count()).select_from(PostShare).where(PostShare.post_id == post.id))
    return PublicPost(
        id=post.id, author=UserPublic.model_validate(author), content=post.content,
        media=[PostMediaView.model_validate(m) for m in media],
        like_count=likes or 0, comment_count=comments or 0, share_count=shares or 0,
        created_at=post.created_at,
    )


@public.get("/public/blog")
async def public_blog_list(limit: int = Query(20, ge=1, le=50), category: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(BlogPost).where(BlogPost.status == "published")
    if category:
        q = q.where(BlogPost.category == category)
    q = q.order_by(BlogPost.published_at.desc()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    items = []
    for b in rows:
        author = await db.get(User, b.author_id)
        items.append(BlogPostView(
            id=b.id, title=b.title, slug=b.slug, content=b.content,
            excerpt=b.excerpt, cover_image_url=b.cover_image_url,
            category=b.category, status=b.status, author_id=b.author_id,
            author_name=author.display_name if author else None,
            author_avatar=author.avatar_url if author else None,
            published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
        ))
    return {"items": items}


@public.get("/public/blog/{slug}", response_model=BlogPostView)
async def public_blog_post(slug: str, db: AsyncSession = Depends(get_db)):
    b = await db.scalar(select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published"))
    if not b:
        raise HTTPException(404, "Blog post not found")
    author = await db.get(User, b.author_id)
    return BlogPostView(
        id=b.id, title=b.title, slug=b.slug, content=b.content,
        excerpt=b.excerpt, cover_image_url=b.cover_image_url,
        category=b.category, status=b.status, author_id=b.author_id,
        author_name=author.display_name if author else None,
        author_avatar=author.avatar_url if author else None,
        published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
    )


# ══════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS (Admin auth required)
# ══════════════════════════════════════════════════════════════

admin = APIRouter()


@admin.get("/admin/stats", response_model=AdminStats)
async def admin_stats(admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_posts = await db.scalar(select(func.count()).select_from(Post).where(Post.deleted_at.is_(None)))
    total_reports = await db.scalar(select(func.count()).select_from(Report))
    pending_reports = await db.scalar(select(func.count()).select_from(Report).where(Report.status == "pending"))
    total_blog = await db.scalar(select(func.count()).select_from(BlogPost))
    new_today = await db.scalar(select(func.count()).select_from(User).where(User.created_at >= today_start))
    active_today = await db.scalar(select(func.count()).select_from(User).where(User.is_online == True))
    return AdminStats(
        total_users=total_users or 0, total_posts=total_posts or 0,
        total_reports=total_reports or 0, pending_reports=pending_reports or 0,
        total_blog_posts=total_blog or 0, new_users_today=new_today or 0,
        active_users_today=active_today or 0,
    )


@admin.get("/admin/users")
async def admin_list_users(
    q: str | None = None, role: str | None = None, banned: bool | None = None,
    limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_q = select(func.count()).select_from(User)
    if q:
        like = f"%{q}%"
        query = query.where(or_(User.username.ilike(like), User.display_name.ilike(like), User.email.ilike(like)))
        count_q = count_q.where(or_(User.username.ilike(like), User.display_name.ilike(like), User.email.ilike(like)))
    if role:
        query = query.where(User.role == role)
        count_q = count_q.where(User.role == role)
    if banned is not None:
        query = query.where(User.is_banned == banned)
        count_q = count_q.where(User.is_banned == banned)
    total = await db.scalar(count_q)
    users = (await db.execute(query.order_by(User.created_at.desc()).limit(limit).offset(offset))).scalars().all()
    return {"items": [UserMe.model_validate(u) for u in users], "total": total or 0}


@admin.get("/admin/users/{user_id}", response_model=UserMe)
async def admin_get_user(user_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@admin.patch("/admin/users/{user_id}", response_model=UserMe)
async def admin_update_user(user_id: str, data: AdminUserUpdate, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if data.role is not None:
        if data.role not in ("user", "moderator", "admin", "super_admin"):
            raise HTTPException(400, "Invalid role")
        user.role = data.role
    if data.is_verified is not None:
        user.is_verified = data.is_verified
        user.verified_at = utcnow() if data.is_verified else None
    if data.is_banned is not None:
        user.is_banned = data.is_banned
        user.banned_at = utcnow() if data.is_banned else None
    if data.ban_reason is not None:
        user.ban_reason = data.ban_reason
    await db.commit()
    await db.refresh(user)
    return user


@admin.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin_user.id:
        raise HTTPException(400, "Cannot delete yourself")
    if user.role == "super_admin":
        raise HTTPException(400, "Cannot delete super admin")
    await db.delete(user)
    await db.commit()
    return {"success": True}


@admin.get("/admin/reports")
async def admin_list_reports(
    status: str | None = None, type: str | None = None,
    limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db),
):
    query = select(Report)
    count_q = select(func.count()).select_from(Report)
    if status:
        query = query.where(Report.status == status)
        count_q = count_q.where(Report.status == status)
    if type:
        query = query.where(Report.type == type)
        count_q = count_q.where(Report.type == type)
    total = await db.scalar(count_q)
    reports = (await db.execute(query.order_by(Report.created_at.desc()).limit(limit).offset(offset))).scalars().all()
    items = []
    for r in reports:
        reporter = await db.get(User, r.reporter_id)
        items.append({
            "id": r.id, "reporter_id": r.reporter_id,
            "reporter_name": reporter.display_name if reporter else None,
            "reporter_avatar": reporter.avatar_url if reporter else None,
            "type": r.type, "target_id": r.target_id, "reason": r.reason,
            "details": r.details, "status": r.status,
            "action_taken": r.action_taken, "resolution_notes": r.resolution_notes,
            "created_at": r.created_at.isoformat(),
        })
    return {"items": items, "total": total or 0}


@admin.get("/admin/reports/{report_id}")
async def admin_get_report(report_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    reporter = await db.get(User, r.reporter_id)
    return {
        "id": r.id, "reporter_id": r.reporter_id,
        "reporter_name": reporter.display_name if reporter else None,
        "reporter_avatar": reporter.avatar_url if reporter else None,
        "type": r.type, "target_id": r.target_id, "reason": r.reason,
        "details": r.details, "status": r.status,
        "action_taken": r.action_taken, "resolution_notes": r.resolution_notes,
        "created_at": r.created_at.isoformat(),
    }


@admin.patch("/admin/reports/{report_id}")
async def admin_update_report(report_id: str, data: AdminReportUpdate, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Report, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    if data.status not in ("pending", "reviewed", "resolved", "dismissed"):
        raise HTTPException(400, "Invalid status")
    r.status = data.status
    r.action_taken = data.action_taken
    r.resolution_notes = data.resolution_notes
    r.reviewed_by = admin_user.id
    r.reviewed_at = utcnow()
    await db.commit()
    return {"success": True}


@admin.get("/admin/posts")
async def admin_list_posts(
    q: str | None = None, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db),
):
    query = select(Post).where(Post.deleted_at.is_(None))
    count_q = select(func.count()).select_from(Post).where(Post.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        query = query.where(Post.content.ilike(like))
        count_q = count_q.where(Post.content.ilike(like))
    total = await db.scalar(count_q)
    rows = (await db.execute(query.order_by(Post.created_at.desc()).limit(limit).offset(offset))).scalars().all()
    items = []
    for p in rows:
        author = await db.get(User, p.author_id)
        items.append({
            "id": p.id, "content": p.content, "visibility": p.visibility,
            "author_id": p.author_id, "author_name": author.display_name if author else None,
            "author_username": author.username if author else None,
            "created_at": p.created_at.isoformat(),
        })
    return {"items": items, "total": total or 0}


@admin.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    post.deleted_at = utcnow()
    await db.commit()
    return {"success": True}


@admin.get("/admin/blog")
async def admin_list_blog(
    status: str | None = None, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db),
):
    query = select(BlogPost)
    count_q = select(func.count()).select_from(BlogPost)
    if status:
        query = query.where(BlogPost.status == status)
        count_q = count_q.where(BlogPost.status == status)
    total = await db.scalar(count_q)
    rows = (await db.execute(query.order_by(BlogPost.created_at.desc()).limit(limit).offset(offset))).scalars().all()
    items = []
    for b in rows:
        author = await db.get(User, b.author_id)
        items.append(BlogPostView(
            id=b.id, title=b.title, slug=b.slug, content=b.content,
            excerpt=b.excerpt, cover_image_url=b.cover_image_url,
            category=b.category, status=b.status, author_id=b.author_id,
            author_name=author.display_name if author else None,
            author_avatar=author.avatar_url if author else None,
            published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
        ))
    return {"items": [i.model_dump() for i in items], "total": total or 0}


@admin.post("/admin/blog", response_model=BlogPostView, status_code=201)
async def admin_create_blog(data: BlogPostCreate, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    slug = data.title.lower().replace(" ", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")[:100]
    existing = await db.scalar(select(BlogPost.id).where(BlogPost.slug == slug))
    if existing:
        slug = f"{slug}-{secrets.token_hex(3)}"
    published_at = utcnow() if data.status == "published" else None
    b = BlogPost(
        title=data.title, slug=slug, content=data.content,
        excerpt=data.excerpt, cover_image_url=data.cover_image_url,
        category=data.category, status=data.status,
        author_id=admin_user.id, published_at=published_at,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return BlogPostView(
        id=b.id, title=b.title, slug=b.slug, content=b.content,
        excerpt=b.excerpt, cover_image_url=b.cover_image_url,
        category=b.category, status=b.status, author_id=b.author_id,
        author_name=admin_user.display_name, author_avatar=admin_user.avatar_url,
        published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
    )


@admin.get("/admin/blog/{blog_id}", response_model=BlogPostView)
async def admin_get_blog(blog_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    b = await db.get(BlogPost, blog_id)
    if not b:
        raise HTTPException(404, "Blog post not found")
    author = await db.get(User, b.author_id)
    return BlogPostView(
        id=b.id, title=b.title, slug=b.slug, content=b.content,
        excerpt=b.excerpt, cover_image_url=b.cover_image_url,
        category=b.category, status=b.status, author_id=b.author_id,
        author_name=author.display_name if author else None,
        author_avatar=author.avatar_url if author else None,
        published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
    )


@admin.patch("/admin/blog/{blog_id}", response_model=BlogPostView)
async def admin_update_blog(blog_id: str, data: BlogPostUpdate, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    b = await db.get(BlogPost, blog_id)
    if not b:
        raise HTTPException(404, "Blog post not found")
    if data.title is not None:
        b.title = data.title
        slug = data.title.lower().replace(" ", "-")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")[:100]
        existing = await db.scalar(select(BlogPost.id).where(BlogPost.slug == slug, BlogPost.id != blog_id))
        if existing:
            slug = f"{slug}-{secrets.token_hex(3)}"
        b.slug = slug
    if data.content is not None: b.content = data.content
    if data.excerpt is not None: b.excerpt = data.excerpt
    if data.cover_image_url is not None: b.cover_image_url = data.cover_image_url
    if data.category is not None: b.category = data.category
    if data.status is not None:
        b.status = data.status
        if data.status == "published" and not b.published_at:
            b.published_at = utcnow()
    b.updated_at = utcnow()
    await db.commit()
    await db.refresh(b)
    author = await db.get(User, b.author_id)
    return BlogPostView(
        id=b.id, title=b.title, slug=b.slug, content=b.content,
        excerpt=b.excerpt, cover_image_url=b.cover_image_url,
        category=b.category, status=b.status, author_id=b.author_id,
        author_name=author.display_name if author else None,
        author_avatar=author.avatar_url if author else None,
        published_at=b.published_at, created_at=b.created_at, updated_at=b.updated_at,
    )


@admin.delete("/admin/blog/{blog_id}")
async def admin_delete_blog(blog_id: str, admin_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    b = await db.get(BlogPost, blog_id)
    if not b:
        raise HTTPException(404, "Blog post not found")
    await db.delete(b)
    await db.commit()
    return {"success": True}


# ── Verification Requests ──────────────────────────────────────────

@router.post("/verification/request", response_model=VerificationRequestView, status_code=201)
async def submit_verification_request(
    data: VerificationRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user.id,
            VerificationRequest.status == "pending",
        )
    )
    if existing:
        raise HTTPException(400, "You already have a pending verification request")

    if user.is_verified:
        raise HTTPException(400, "Your account is already verified")

    import json as _json
    req = VerificationRequest(
        id=new_id(),
        user_id=user.id,
        category=data.category,
        display_name=data.display_name,
        reason=data.reason,
        document_urls=_json.dumps(data.document_urls) if data.document_urls else None,
        status="pending",
        created_at=utcnow(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    doc_urls = []
    if req.document_urls:
        try:
            doc_urls = _json.loads(req.document_urls)
        except Exception:
            doc_urls = []

    return VerificationRequestView(
        id=req.id, user_id=req.user_id, category=req.category,
        display_name=req.display_name, reason=req.reason,
        document_urls=doc_urls, status=req.status,
        created_at=req.created_at, updated_at=req.updated_at,
    )


@router.get("/verification/my-request", response_model=VerificationRequestView | None)
async def get_my_verification_request(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json as _json
    req = await db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user.id,
        ).order_by(VerificationRequest.created_at.desc())
    )
    if not req:
        return None
    doc_urls = []
    if req.document_urls:
        try:
            doc_urls = _json.loads(req.document_urls)
        except Exception:
            doc_urls = []
    return VerificationRequestView(
        id=req.id, user_id=req.user_id, category=req.category,
        display_name=req.display_name, reason=req.reason,
        document_urls=doc_urls, status=req.status,
        admin_id=req.admin_id, admin_notes=req.admin_notes,
        created_at=req.created_at, updated_at=req.updated_at,
    )


@admin.get("/admin/verification")
async def admin_list_verification_requests(
    status: str | None = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    import json as _json
    q = select(VerificationRequest)
    if status:
        q = q.where(VerificationRequest.status == status)
    q = q.order_by(VerificationRequest.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    total = await db.scalar(select(func.count()).select_from(VerificationRequest).where(
        VerificationRequest.status == status if status else True
    ))

    items = []
    for r in rows:
        u = await db.get(User, r.user_id)
        doc_urls = []
        if r.document_urls:
            try:
                doc_urls = _json.loads(r.document_urls)
            except Exception:
                doc_urls = []
        items.append(VerificationRequestAdminView(
            id=r.id, user_id=r.user_id,
            username=u.username if u else None,
            display_name=u.display_name if u else None,
            avatar_url=u.avatar_url if u else None,
            category=r.category, req_display_name=r.display_name,
            reason=r.reason, document_urls=doc_urls,
            status=r.status, admin_id=r.admin_id,
            admin_notes=r.admin_notes,
            verified_until=r.verified_until if r.verified_until else (u.verified_until if u and u.verified_until else None),
            created_at=r.created_at, updated_at=r.updated_at,
        ))
    return {"items": items, "total": total or 0}


@admin.get("/admin/verification/{request_id}")
async def admin_get_verification_request(
    request_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    import json as _json
    r = await db.get(VerificationRequest, request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    u = await db.get(User, r.user_id)
    doc_urls = []
    if r.document_urls:
        try:
            doc_urls = _json.loads(r.document_urls)
        except Exception:
            doc_urls = []
    return VerificationRequestAdminView(
        id=r.id, user_id=r.user_id,
        username=u.username if u else None,
        display_name=u.display_name if u else None,
        avatar_url=u.avatar_url if u else None,
        category=r.category, req_display_name=r.display_name,
        reason=r.reason, document_urls=doc_urls,
        status=r.status, admin_id=r.admin_id,
        admin_notes=r.admin_notes,
        verified_until=r.verified_until if r.verified_until else (u.verified_until if u and u.verified_until else None),
        created_at=r.created_at, updated_at=r.updated_at,
    )


@admin.patch("/admin/verification/{request_id}")
async def admin_update_verification_request(
    request_id: str,
    data: VerificationRequestUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.get(VerificationRequest, request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    r.status = data.status
    r.admin_id = admin_user.id
    r.admin_notes = data.admin_notes
    r.updated_at = utcnow()

    if data.status == "approved":
        user = await db.get(User, r.user_id)
        if user:
            user.is_verified = True
            user.verified_category = r.category
            user.verified_at = utcnow()
            duration = data.duration_days if data.duration_days else 365
            user.verified_until = utcnow() + timedelta(days=duration)
            r.verified_until = user.verified_until
            notif = Notification(
                user_id=r.user_id,
                type="verification",
                body=f"🎉 Congratulations! Your account has been verified as {r.category}. Your badge is now visible on your profile and posts.",
            )
            db.add(notif)
    elif data.status == "rejected":
        user = await db.get(User, r.user_id)
        if user:
            user.is_verified = False
            user.verified_category = None
            reason_text = data.admin_notes if data.admin_notes else "No reason provided"
            notif = Notification(
                user_id=r.user_id,
                type="verification",
                body=f"Your verification request was declined. Reason: {reason_text}. You can submit a new request after 7 days.",
            )
            db.add(notif)

    await db.commit()
    return {"success": True, "status": r.status}
