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
    cover_url: str | None = None
    custom_status: str | None = None
    accent_color: str | None = None
    location: str | None = None
    website: str | None = None
    date_of_birth: str | None = None
    is_online: bool
    last_seen_at: datetime | None
    created_at: datetime | None = None


class UserMe(UserPublic):
    email: str
    phone_code: str | None = None
    phone: str | None = None
    last_seen_visible: bool = True
    online_visible: bool = True
    who_can_message: str = "everyone"
    who_can_see_posts: str = "public"
    read_receipts: bool = True
    typing_indicator: bool = True
    font_size: str = "default"
    chat_wallpaper: str | None = None
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
    cover_url: str | None = None
    custom_status: str | None = Field(default=None, max_length=100)
    accent_color: str | None = Field(default=None, max_length=9)
    location: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=200)
    date_of_birth: str | None = Field(default=None, max_length=10)
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    phone_code: str | None = Field(default=None, max_length=8)
    phone: str | None = Field(default=None, max_length=20)
    last_seen_visible: bool | None = None
    online_visible: bool | None = None
    who_can_message: str | None = None
    who_can_see_posts: str | None = None
    read_receipts: bool | None = None
    typing_indicator: bool | None = None
    font_size: str | None = None
    chat_wallpaper: str | None = None


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
    display_name: str = ""
    avatar_url: str | None = None


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


class StoryReactionView(BaseModel):
    emoji: str
    user_id: str
    display_name: str = ""
    avatar_url: str | None = None


class StoryReactionResponse(BaseModel):
    emoji: str
    reaction_count: int
    my_reaction: str | None = None
    reactions: list[StoryReactionView]


class StoryReplyView(BaseModel):
    id: str
    sender: UserPublic
    content: str | None
    created_at: datetime


class StoryViewUser(BaseModel):
    id: str
    display_name: str
    avatar_url: str | None = None
    viewed_at: datetime


# ── Follow ─────────────────────────────────────────────────────


class FollowResponse(BaseModel):
    following: bool
    follower_count: int
    following_count: int


class FollowUserView(UserPublic):
    followed_at: datetime


class FollowListPage(BaseModel):
    items: list[FollowUserView]
    next_cursor: str | None


class UserProfileView(BaseModel):
    user: UserPublic
    follower_count: int
    following_count: int
    post_count: int
    is_following: bool
    is_self: bool
    mutual_friend_count: int = 0
    profile_view_count: int = 0


# ── Story Highlights ───────────────────────────────────────────


class HighlightCreate(BaseModel):
    title: str = Field(max_length=50)
    cover_url: str | None = None


class HighlightView(ORMModel):
    id: str
    title: str
    cover_url: str | None
    sort_order: int
    story_count: int = 0
    created_at: datetime


class HighlightListPage(BaseModel):
    items: list[HighlightView]
    next_cursor: str | None


# ── Profile Media ──────────────────────────────────────────────


class ProfileMediaItem(BaseModel):
    id: str
    url: str
    mime_type: str | None
    post_id: str
    created_at: datetime


class ProfileMediaPage(BaseModel):
    items: list[ProfileMediaItem]
    next_cursor: str | None


# ── Social Links ───────────────────────────────────────────────


class SocialLinkCreate(BaseModel):
    platform: str = Field(..., max_length=30)
    username: str = Field(..., min_length=1, max_length=120)
    url: str = Field(..., max_length=300)
    sort_order: int = 0


class SocialLinkView(BaseModel):
    id: str
    platform: str
    username: str
    url: str
    sort_order: int


class SocialLinkListPage(BaseModel):
    items: list[SocialLinkView]
    next_cursor: str | None = None


# ── Location Search ────────────────────────────────────────────


class LocationResult(BaseModel):
    display_name: str
    lat: float
    lon: float


# ── Notification Preferences ────────────────────────────────────


class NotificationPreferenceView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    messages: bool = True
    calls: bool = True
    posts: bool = True
    comments: bool = True
    reactions: bool = True
    follows: bool = True
    mentions: bool = True
    group_activity: bool = True


class NotificationPreferenceUpdate(BaseModel):
    messages: bool | None = None
    calls: bool | None = None
    posts: bool | None = None
    comments: bool | None = None
    reactions: bool | None = None
    follows: bool | None = None
    mentions: bool | None = None
    group_activity: bool | None = None


# ── Change Password / Email ────────────────────────────────────


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    password: str
    new_email: str


# ── Report ─────────────────────────────────────────────────────


class ReportRequest(BaseModel):
    type: str
    target_id: str | None = None
    reason: str
    details: str | None = None
