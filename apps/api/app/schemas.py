from datetime import datetime

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
    created_at: datetime


class UserSearchResult(UserPublic):
    is_friend: bool = False
    request_status: str | None = None
    is_blocked: bool = False


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


class DeviceCreate(BaseModel):
    push_token: str = Field(min_length=10, max_length=500)
    platform: str = Field(pattern=r"^(ios|android|web)$")
