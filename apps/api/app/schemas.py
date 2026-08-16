from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserPublic(ORMModel):
    id: str
    username: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    is_online: bool
    last_seen_at: datetime | None


class UserMe(UserPublic):
    email: str
    phone_code: str | None = None
    phone: str | None = None
    created_at: datetime


class UserSearchResult(UserPublic):
    is_friend: bool = False
    request_status: str | None = None
    request_id: str | None = None
    is_blocked: bool = False
    phone_code: str | None = None
    phone: str | None = None


class FriendView(UserPublic):
    remark: str | None = None


class FriendRemarkUpdate(BaseModel):
    remark: str | None = Field(default=None, max_length=80)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,32}$")
    display_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    device_name: str = Field(default="Unknown device", max_length=120)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or "." not in value.rsplit("@", 1)[1]:
            raise ValueError("invalid email address")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str
    device_name: str = Field(default="Unknown device", max_length=120)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=20)
    device_name: str = Field(default="Unknown device", max_length=120)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(TokenPair):
    user: UserMe


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_]{3,32}$")
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: HttpUrl | None = None
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    phone_code: str | None = Field(default=None, max_length=8)
    phone: str | None = Field(default=None, max_length=20)


class FriendRequestCreate(BaseModel):
    user_id: str


class FriendRequestView(ORMModel):
    id: str
    requester_id: str
    recipient_id: str
    status: str
    created_at: datetime


class ConversationCreate(BaseModel):
    user_id: str


class GroupSummary(BaseModel):
    id: str
    name: str
    description: str | None
    avatar_url: str | None
    owner_id: str
    my_role: str
    member_count: int


class ConversationView(BaseModel):
    id: str
    kind: str
    title: str | None = None
    group: GroupSummary | None = None
    members: list[UserPublic]
    unread_count: int
    updated_at: datetime
    last_message: MessageView | None = None


class GroupSettings(BaseModel):
    can_send: Literal["everyone", "admins"] = "everyone"
    can_send_media: Literal["everyone", "admins"] = "everyone"
    can_add_members: Literal["everyone", "admins"] = "admins"
    can_edit_info: Literal["everyone", "admins"] = "admins"


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    member_ids: list[str] = Field(default_factory=list, max_length=500)

    @field_validator("name")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("group name cannot be blank")
        return value.strip()


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    avatar_url: HttpUrl | None = None
    settings: GroupSettings | None = None
    customization: dict | None = None

    @field_validator("name")
    @classmethod
    def nonblank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("group name cannot be blank")
        return value.strip() if value is not None else value


class GroupMemberView(BaseModel):
    user: UserPublic
    role: str
    joined_at: datetime


class GroupView(BaseModel):
    id: str
    name: str
    description: str | None
    avatar_url: str | None
    conversation_id: str
    owner_id: str
    member_count: int
    my_role: str
    members: list[GroupMemberView]
    updated_at: datetime
    settings: GroupSettings | None = None
    customization: dict | None = None


class GroupMemberAdd(BaseModel):
    user_ids: list[str] = Field(min_length=1, max_length=200)


class GroupMemberRole(BaseModel):
    role: str = Field(pattern=r"^(admin|member)$")


class GroupApplicationCreate(BaseModel):
    group_id: str


class GroupApplicationView(BaseModel):
    id: str
    group_id: str
    group_name: str
    applicant: UserPublic
    status: str
    created_at: datetime


class MessageCreate(BaseModel):
    content: str = Field(default="", max_length=10000)
    reply_to_id: str | None = None
    attachment_ids: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("content")
    @classmethod
    def nonblank(cls, value: str) -> str:
        return value.strip()


class MessageUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message cannot be blank")
        return value.strip()


class ReactionView(ORMModel):
    emoji: str
    user_id: str


class AttachmentView(ORMModel):
    id: str
    name: str
    url: str
    mime_type: str
    size: int


class MessageView(ORMModel):
    id: str
    conversation_id: str
    sender_id: str
    reply_to_id: str | None
    content: str
    edited_at: datetime | None
    deleted_at: datetime | None
    created_at: datetime
    reactions: list[ReactionView] = Field(default_factory=list)
    attachments: list[AttachmentView] = Field(default_factory=list)
    read_by_count: int = 0


class MessagePage(BaseModel):
    items: list[MessageView]
    next_cursor: str | None


class ReactionToggle(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)


class ReadRequest(BaseModel):
    message_id: str


class UploadResponse(BaseModel):
    url: str


class MediaUploadResponse(AttachmentView):
    pass


class GiphyMediaCreate(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    kind: Literal["gif", "sticker"]
    title: str = Field(default="GIPHY media", max_length=255)
    url: str = Field(min_length=1, max_length=2000)


class DeviceCreate(BaseModel):
    push_token: str = Field(min_length=10, max_length=500)
    platform: str = Field(pattern=r"^(ios|android|web)$")


class DeletionCodeRequest(BaseModel):
    password: str


class DeletionCodeSent(BaseModel):
    message: str
    email_masked: str


class DeleteAccountRequest(BaseModel):
    password: str
    code: str = Field(pattern=r"^\d{6}$")


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or "." not in value.rsplit("@", 1)[1]:
            raise ValueError("invalid email address")
        return value


class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str = Field(pattern=r"^\d{6}$")


class ResetPasswordRequest(BaseModel):
    email: str
    code: str = Field(pattern=r"^\d{6}$")
    password: str = Field(min_length=8, max_length=128)


# ── Feed / Posts ────────────────────────────────────────────────


class PostMediaView(ORMModel):
    id: str
    url: str
    mime_type: str
    sort_order: int


class PostReactionView(ORMModel):
    emoji: str
    user_id: str


class CreatePostRequest(BaseModel):
    content: str | None = Field(default=None, max_length=5000)
    media_ids: list[str] = Field(default_factory=list, max_length=10)
    visibility: Literal["friends", "public"] = "public"


class PostView(BaseModel):
    id: str
    author: UserPublic
    content: str | None
    visibility: str
    media: list[PostMediaView] = Field(default_factory=list)
    reactions: list[PostReactionView] = Field(default_factory=list)
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    my_like_emoji: str | None = None
    my_bookmarked: bool = False
    my_shared: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class PostPage(BaseModel):
    items: list[PostView]
    next_cursor: str | None


# ── Comments ────────────────────────────────────────────────────


class CreateCommentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    parent_id: str | None = None


class CommentReactionView(ORMModel):
    emoji: str
    user_id: str


class CommentView(BaseModel):
    id: str
    post_id: str
    author: UserPublic
    content: str
    parent_id: str | None = None
    reactions: list[CommentReactionView] = Field(default_factory=list)
    reaction_count: int = 0
    reply_count: int = 0
    created_at: datetime


class CommentPage(BaseModel):
    items: list[CommentView]
    next_cursor: str | None


# ── Reactions / Shares / Bookmarks ──────────────────────────────


class ReactRequest(BaseModel):
    emoji: str = Field(default="\U0001f44d", max_length=10)


class ReactResponse(BaseModel):
    like_count: int
    my_like_emoji: str | None
    reactions: list[PostReactionView]


class ShareResponse(BaseModel):
    share_count: int
    my_shared: bool


class BookmarkResponse(BaseModel):
    my_bookmarked: bool


# ── Stories ─────────────────────────────────────────────────────


class CreateStoryRequest(BaseModel):
    media_id: str
    content: str | None = Field(default=None, max_length=500)


class StoryView_(BaseModel):
    id: str
    media_url: str
    media_type: str
    content: str | None
    created_at: datetime
    expires_at: datetime
    view_count: int = 0
    my_viewed: bool = False


class StoryGroupView(BaseModel):
    author: UserPublic
    stories: list[StoryView_]
    has_unviewed: bool = False
