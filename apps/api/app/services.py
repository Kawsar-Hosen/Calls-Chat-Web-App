from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (Block, Conversation, ConversationMember, Friendship, Group, GroupMember,
                        MediaAttachment, Message, Reaction, User)
from app.schemas import AttachmentView, GroupMemberView, GroupView, GroupSummary, MessageView, ReactionView


async def ensure_not_blocked(db: AsyncSession, first_id: str, second_id: str) -> None:
    blocked = await db.scalar(
        select(Block.id).where(
            or_(
                and_(Block.blocker_id == first_id, Block.blocked_id == second_id),
                and_(Block.blocker_id == second_id, Block.blocked_id == first_id),
            )
        )
    )
    if blocked:
        raise HTTPException(status_code=403, detail="Interaction unavailable")


async def are_friends(db: AsyncSession, first_id: str, second_id: str) -> bool:
    return bool(
        await db.scalar(
            select(Friendship.id).where(
                Friendship.user_low_id == min(first_id, second_id),
                Friendship.user_high_id == max(first_id, second_id),
            )
        )
    )


async def require_member(db: AsyncSession, conversation_id: str, user_id: str) -> ConversationMember:
    member = await db.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return member


async def member_ids(db: AsyncSession, conversation_id: str) -> list[str]:
    return list(
        (await db.scalars(select(ConversationMember.user_id).where(ConversationMember.conversation_id == conversation_id))).all()
    )


async def message_view(db: AsyncSession, message: Message) -> MessageView:
    reactions = (
        await db.scalars(select(Reaction).where(Reaction.message_id == message.id).order_by(Reaction.created_at))
    ).all()
    attachments = (
        await db.scalars(select(MediaAttachment).where(MediaAttachment.message_id == message.id).order_by(MediaAttachment.created_at))
    ).all()
    return MessageView.model_validate(message).model_copy(
        update={
            "reactions": [ReactionView.model_validate(item) for item in reactions],
            "attachments": [AttachmentView.model_validate(item) for item in attachments],
        }
    )


async def unread_count(db: AsyncSession, member: ConversationMember) -> int:
    query = select(func.count(Message.id)).where(
        Message.conversation_id == member.conversation_id,
        Message.sender_id != member.user_id,
        Message.deleted_at.is_(None),
    )
    if member.last_read_at:
        query = query.where(Message.created_at > member.last_read_at)
    return int((await db.scalar(query)) or 0)


async def public_members(db: AsyncSession, conversation_id: str) -> list[User]:
    return list(
        (
            await db.scalars(
                select(User)
                .join(ConversationMember, ConversationMember.user_id == User.id)
                .where(ConversationMember.conversation_id == conversation_id)
            )
        ).all()
    )


async def require_group_member(db: AsyncSession, group_id: str, user_id: str) -> GroupMember:
    member = await db.scalar(
        select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    )
    if not member:
        raise HTTPException(status_code=404, detail="Group not found")
    return member


async def require_group(db: AsyncSession, group_id: str) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


async def require_group_role(db: AsyncSession, group_id: str, user_id: str, roles: tuple[str, ...]) -> GroupMember:
    member = await require_group_member(db, group_id, user_id)
    if member.role not in roles:
        raise HTTPException(status_code=403, detail="Not allowed")
    return member


async def group_view(db: AsyncSession, group: Group, user_id: str) -> GroupView:
    members = (await db.scalars(select(GroupMember).where(GroupMember.group_id == group.id))).all()
    users = list((await db.scalars(select(User).where(User.id.in_([m.user_id for m in members])))).all())
    by_id = {u.id: u for u in users}
    mine = next((m for m in members if m.user_id == user_id), None)
    member_views = [
        GroupMemberView(user=by_id[m.user_id], role=m.role, joined_at=m.joined_at)
        for m in members
        if m.user_id in by_id
    ]
    return GroupView(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        conversation_id=group.conversation_id,
        owner_id=group.owner_id,
        member_count=len(members),
        my_role=mine.role if mine else "member",
        members=member_views,
        updated_at=group.updated_at,
    )


async def group_summary(db: AsyncSession, group: Group, user_id: str) -> GroupSummary:
    mine = await db.scalar(
        select(GroupMember.role).where(GroupMember.group_id == group.id, GroupMember.user_id == user_id)
    )
    member_count = int((await db.scalar(select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id))) or 0)
    return GroupSummary(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        owner_id=group.owner_id,
        my_role=mine or "member",
        member_count=member_count,
    )


async def sync_group_conversation_members(db: AsyncSession, group: Group) -> None:
    """Make sure every group member is a member of the backing conversation."""
    group_user_ids = set(
        (await db.scalars(select(GroupMember.user_id).where(GroupMember.group_id == group.id))).all()
    )
    existing = set(
        (await db.scalars(select(ConversationMember.user_id).where(ConversationMember.conversation_id == group.conversation_id))).all()
    )
    missing = group_user_ids - existing
    for user_id in missing:
        db.add(ConversationMember(conversation_id=group.conversation_id, user_id=user_id))


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
