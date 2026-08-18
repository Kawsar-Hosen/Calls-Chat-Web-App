from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models import (CommentLike, Follow, Friendship, MediaAttachment, Post, PostBookmark, PostComment, PostLike,
                        PostMedia, PostShare, Story, StoryHighlight, StoryHighlightItem, StoryReaction, StoryReply, StoryView,
                        ProfileView, User, new_id, utcnow)
from app.schemas import (BookmarkResponse, CommentPage, CommentView, CommentReactionView,
                         CreateCommentRequest, CreatePostRequest, CreateStoryRequest,
                         FollowListPage, FollowResponse, FollowUserView, HighlightCreate, HighlightListPage, HighlightView,
                         PostPage, PostReactionView, PostView, PostMediaView, ProfileMediaItem, ProfileMediaPage,
                         ReactRequest, ReactResponse, ShareResponse, StoryGroupView, StoryReactionResponse,
                         StoryReactionView, StoryReplyView, StoryView_, StoryViewUser, UserPublic, UserProfileView)
from app.push import push_to_users
from app.websocket import manager
from app.services import are_friends
from app.storage import storage

feed = APIRouter()

# ── Helpers ─────────────────────────────────────────────────────


async def _post_view(db: AsyncSession, post: Post, user: User) -> PostView:
    author = await db.get(User, post.author_id)
    media = (await db.scalars(select(PostMedia).where(PostMedia.post_id == post.id).order_by(PostMedia.sort_order))).all()
    reactions = (await db.scalars(select(PostLike).where(PostLike.post_id == post.id))).all()
    like_count = int((await db.scalar(select(func.count(PostLike.id)).where(PostLike.post_id == post.id))) or 0)
    comment_count = int((await db.scalar(select(func.count(PostComment.id)).where(PostComment.post_id == post.id, PostComment.deleted_at.is_(None)))) or 0)
    share_count = int((await db.scalar(select(func.count(PostShare.id)).where(PostShare.post_id == post.id))) or 0)
    my_like = await db.scalar(select(PostLike).where(PostLike.post_id == post.id, PostLike.user_id == user.id))
    my_bm = await db.scalar(select(PostBookmark).where(PostBookmark.post_id == post.id, PostBookmark.user_id == user.id))
    my_sh = await db.scalar(select(PostShare).where(PostShare.post_id == post.id, PostShare.user_id == user.id))
    reactor_ids = list({r.user_id for r in reactions})
    reactor_map: dict[str, User] = {}
    if reactor_ids:
        rows = (await db.scalars(select(User).where(User.id.in_(reactor_ids)))).all()
        reactor_map = {r.id: r for r in rows}
    return PostView(
        id=post.id,
        author=UserPublic.model_validate(author),
        content=post.content,
        visibility=post.visibility,
        media=[PostMediaView.model_validate(m) for m in media],
        reactions=[PostReactionView(emoji=r.emoji, user_id=r.user_id, display_name=reactor_map.get(r.user_id, None) and reactor_map[r.user_id].display_name, avatar_url=reactor_map.get(r.user_id, None) and reactor_map[r.user_id].avatar_url) for r in reactions],
        like_count=like_count,
        comment_count=comment_count,
        share_count=share_count,
        my_like_emoji=my_like.emoji if my_like else None,
        my_bookmarked=bool(my_bm),
        my_shared=bool(my_sh),
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


async def _comment_view(db: AsyncSession, comment: PostComment) -> CommentView:
    author = await db.get(User, comment.author_id)
    reactions = (await db.scalars(select(CommentLike).where(CommentLike.comment_id == comment.id))).all()
    reaction_count = int((await db.scalar(select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment.id))) or 0)
    reply_count = int((await db.scalar(select(func.count(PostComment.id)).where(PostComment.parent_id == comment.id, PostComment.deleted_at.is_(None)))) or 0)
    return CommentView(
        id=comment.id,
        post_id=comment.post_id,
        author=UserPublic.model_validate(author),
        content=comment.content,
        parent_id=comment.parent_id,
        reactions=[CommentReactionView(emoji=r.emoji, user_id=r.user_id) for r in reactions],
        reaction_count=reaction_count,
        reply_count=reply_count,
        created_at=comment.created_at,
    )


# ── Feed ────────────────────────────────────────────────────────


@feed.get("/feed")
async def get_feed(
    section: str = Query("friends", pattern="^(friends|public)$"),
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = utcnow()
    q = select(Post).where(Post.deleted_at.is_(None))

    if section == "friends":
        low_ids = select(Friendship.user_low_id).where(
            or_(Friendship.user_low_id == user.id, Friendship.user_high_id == user.id)
        )
        high_ids = select(Friendship.user_high_id).where(
            or_(Friendship.user_low_id == user.id, Friendship.user_high_id == user.id)
        )
        friend_ids = low_ids.union(high_ids)
        q = q.where(or_(Post.author_id == user.id, Post.author_id.in_(friend_ids)))
    else:
        q = q.where(Post.visibility == "public")

    if cursor:
        cursor_post = await db.get(Post, cursor)
        if cursor_post:
            q = q.where(Post.created_at < cursor_post.created_at)

    q = q.order_by(Post.created_at.desc()).limit(limit + 1)
    rows = (await db.scalars(q)).all()
    has_next = len(rows) > limit
    items = rows[:limit]

    return PostPage(
        items=[await _post_view(db, p, user) for p in items],
        next_cursor=items[-1].id if has_next else None,
    )


# ── Posts CRUD ──────────────────────────────────────────────────


@feed.post("/posts", status_code=201)
async def create_post(
    body: CreatePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.content and not body.media_ids:
        raise HTTPException(status_code=400, detail="Post must have content or media")
    post = Post(id=new_id(), author_id=user.id, content=body.content, visibility=body.visibility, created_at=utcnow())
    db.add(post)
    await db.flush()
    for i, mid in enumerate(body.media_ids):
        att = await db.get(MediaAttachment, mid)
        if not att:
            continue
        pm = PostMedia(id=new_id(), post_id=post.id, url=att.url, mime_type=att.mime_type, sort_order=i)
        db.add(pm)
    await db.commit()
    await db.refresh(post)
    return await _post_view(db, post, user)


@feed.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    return await _post_view(db, post, user)


@feed.patch("/posts/{post_id}")
async def edit_post(
    post_id: str,
    body: CreatePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    post.content = body.content
    post.updated_at = utcnow()
    await db.commit()
    await db.refresh(post)
    return await _post_view(db, post, user)


@feed.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    post.deleted_at = utcnow()
    await db.commit()
    return {"ok": True}


@feed.get("/users/{user_id}/posts")
async def user_posts(
    user_id: str,
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Post).where(Post.author_id == user_id, Post.deleted_at.is_(None))
    if cursor:
        cp = await db.get(Post, cursor)
        if cp:
            q = q.where(Post.created_at < cp.created_at)
    q = q.order_by(Post.created_at.desc()).limit(limit + 1)
    rows = (await db.scalars(q)).all()
    has_next = len(rows) > limit
    items = rows[:limit]
    return PostPage(
        items=[await _post_view(db, p, user) for p in items],
        next_cursor=items[-1].id if has_next else None,
    )


# ── Reactions ───────────────────────────────────────────────────


@feed.post("/posts/{post_id}/react")
async def react_post(
    post_id: str,
    body: ReactRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = await db.scalar(select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user.id))
    if existing:
        if existing.emoji == body.emoji:
            await db.delete(existing)
            await db.commit()
            like_count = int((await db.scalar(select(func.count(PostLike.id)).where(PostLike.post_id == post_id))) or 0)
            return ReactResponse(like_count=like_count, my_like_emoji=None, reactions=[])
        existing.emoji = body.emoji
        await db.commit()
    else:
        db.add(PostLike(id=new_id(), post_id=post_id, user_id=user.id, emoji=body.emoji, created_at=utcnow()))
        await db.commit()
    if post.author_id != user.id:
        await push_to_users(db, [post.author_id], {
            "notification": {"title": "New reaction", "body": f"{user.display_name} reacted {body.emoji} to your post"},
            "android": {"notification": {"channel_id": "messages"}},
            "data": {"type": "post.reacted", "post_id": post_id, "user_id": user.id},
        })
    like_count = int((await db.scalar(select(func.count(PostLike.id)).where(PostLike.post_id == post_id))) or 0)
    reactions = (await db.scalars(select(PostLike).where(PostLike.post_id == post_id))).all()
    my_like = await db.scalar(select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user.id))
    reactor_ids = list({r.user_id for r in reactions})
    reactor_map: dict[str, User] = {}
    if reactor_ids:
        rows = (await db.scalars(select(User).where(User.id.in_(reactor_ids)))).all()
        reactor_map = {r.id: r for r in rows}
    return ReactResponse(
        like_count=like_count,
        my_like_emoji=my_like.emoji if my_like else None,
        reactions=[PostReactionView(emoji=r.emoji, user_id=r.user_id, display_name=reactor_map.get(r.user_id, None) and reactor_map[r.user_id].display_name, avatar_url=reactor_map.get(r.user_id, None) and reactor_map[r.user_id].avatar_url) for r in reactions],
    )


# ── Comments ────────────────────────────────────────────────────


@feed.get("/posts/{post_id}/comments")
async def post_comments(
    post_id: str,
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    q = select(PostComment).where(PostComment.post_id == post_id, PostComment.deleted_at.is_(None), PostComment.parent_id.is_(None))
    if cursor:
        cc = await db.get(PostComment, cursor)
        if cc:
            q = q.where(PostComment.created_at < cc.created_at)
    q = q.order_by(PostComment.created_at.desc()).limit(limit + 1)
    rows = (await db.scalars(q)).all()
    has_next = len(rows) > limit
    items = rows[:limit]
    return CommentPage(
        items=[await _comment_view(db, c) for c in items],
        next_cursor=items[-1].id if has_next else None,
    )


@feed.post("/posts/{post_id}/comments", status_code=201)
async def add_comment(
    post_id: str,
    body: CreateCommentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    if body.parent_id:
        parent = await db.get(PostComment, body.parent_id)
        if not parent or parent.deleted_at:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    comment = PostComment(id=new_id(), post_id=post_id, author_id=user.id, content=body.content, parent_id=body.parent_id, created_at=utcnow())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    if post.author_id != user.id:
        await push_to_users(db, [post.author_id], {
            "notification": {"title": "New comment", "body": f"{user.display_name} commented on your post"},
            "android": {"notification": {"channel_id": "messages"}},
            "data": {"type": "post.commented", "post_id": post_id, "user_id": user.id},
        })
    return await _comment_view(db, comment)


@feed.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: str,
    comment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await db.get(PostComment, comment_id)
    if not comment or comment.deleted_at or comment.post_id != post_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    post = await db.get(Post, post_id)
    if comment.author_id != user.id and (post and post.author_id != user.id):
        raise HTTPException(status_code=403, detail="Not allowed")
    comment.deleted_at = utcnow()
    await db.commit()
    return {"ok": True}


@feed.post("/posts/{post_id}/comments/{comment_id}/react")
async def react_comment(
    post_id: str,
    comment_id: str,
    body: ReactRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await db.get(PostComment, comment_id)
    if not comment or comment.deleted_at or comment.post_id != post_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    existing = await db.scalar(select(CommentLike).where(CommentLike.comment_id == comment_id, CommentLike.user_id == user.id))
    if existing:
        await db.delete(existing)
        await db.commit()
    else:
        db.add(CommentLike(id=new_id(), comment_id=comment_id, user_id=user.id, created_at=utcnow()))
        await db.commit()
    count = int((await db.scalar(select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment_id))) or 0)
    my_reaction = await db.scalar(select(CommentLike).where(CommentLike.comment_id == comment_id, CommentLike.user_id == user.id))
    return {"reaction_count": count, "my_reaction": body.emoji if my_reaction else None}


# ── Shares ──────────────────────────────────────────────────────


@feed.post("/posts/{post_id}/share")
async def share_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = await db.scalar(select(PostShare).where(PostShare.post_id == post_id, PostShare.user_id == user.id))
    if existing:
        await db.delete(existing)
        await db.commit()
    else:
        db.add(PostShare(id=new_id(), post_id=post_id, user_id=user.id, created_at=utcnow()))
        await db.commit()
        if post.author_id != user.id:
            await push_to_users(db, [post.author_id], {
                "notification": {"title": "New share", "body": f"{user.display_name} shared your post"},
                "android": {"notification": {"channel_id": "messages"}},
                "data": {"type": "post.shared", "post_id": post_id, "user_id": user.id},
            })
    count = int((await db.scalar(select(func.count(PostShare.id)).where(PostShare.post_id == post_id))) or 0)
    my_shared = await db.scalar(select(PostShare).where(PostShare.post_id == post_id, PostShare.user_id == user.id))
    return ShareResponse(share_count=count, my_shared=bool(my_shared))


# ── Bookmarks ───────────────────────────────────────────────────


@feed.post("/posts/{post_id}/bookmark")
async def bookmark_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = await db.scalar(select(PostBookmark).where(PostBookmark.post_id == post_id, PostBookmark.user_id == user.id))
    if existing:
        await db.delete(existing)
        await db.commit()
        return BookmarkResponse(my_bookmarked=False)
    db.add(PostBookmark(id=new_id(), post_id=post_id, user_id=user.id, created_at=utcnow()))
    await db.commit()
    return BookmarkResponse(my_bookmarked=True)


@feed.get("/bookmarks")
async def get_bookmarks(
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Post)
        .join(PostBookmark, PostBookmark.post_id == Post.id)
        .where(PostBookmark.user_id == user.id, Post.deleted_at.is_(None))
    )
    if cursor:
        cp = await db.get(Post, cursor)
        if cp:
            q = q.where(Post.created_at < cp.created_at)
    q = q.order_by(Post.created_at.desc()).limit(limit + 1)
    rows = (await db.scalars(q)).all()
    has_next = len(rows) > limit
    items = rows[:limit]
    return PostPage(
        items=[await _post_view(db, p, user) for p in items],
        next_cursor=items[-1].id if has_next else None,
    )


# ── Stories ─────────────────────────────────────────────────────


@feed.get("/feed/stories")
async def get_stories(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = utcnow()
    # Show ALL non-expired stories (public stories visible to everyone)
    q = (
        select(Story)
        .where(Story.expires_at > now)
        .order_by(Story.author_id, Story.created_at.desc())
    )
    stories = (await db.scalars(q)).all()

    # Group by author
    groups: dict[str, list[Story]] = {}
    for s in stories:
        groups.setdefault(s.author_id, []).append(s)

    result = []
    for author_id, story_list in groups.items():
        author = await db.get(User, author_id)
        if not author:
            continue
        # Check if all viewed
        viewed_ids = set(
            (await db.scalars(
                select(StoryView.story_id).where(
                    StoryView.viewer_id == user.id,
                    StoryView.story_id.in_([s.id for s in story_list]),
                )
            )).all()
        )
        has_unviewed = any(s.id not in viewed_ids for s in story_list)
        story_views = []
        for s in story_list:
            vc = int((await db.scalar(select(func.count(StoryView.id)).where(StoryView.story_id == s.id))) or 0)
            story_views.append(StoryView_(
                id=s.id, media_url=s.media_url, media_type=s.media_type,
                content=s.content, created_at=s.created_at, expires_at=s.expires_at,
                view_count=vc, my_viewed=s.id in viewed_ids,
            ))
        result.append(StoryGroupView(author=UserPublic.model_validate(author), stories=story_views, has_unviewed=has_unviewed))
    return result


@feed.post("/stories", status_code=201)
async def create_story(
    body: CreateStoryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    att = await db.get(MediaAttachment, body.media_id)
    if not att:
        raise HTTPException(status_code=404, detail="Media not found")
    now = utcnow()
    story = Story(
        id=new_id(), author_id=user.id, content=body.content,
        media_url=att.url, media_type="video" if "video" in att.mime_type else "image",
        created_at=now, expires_at=now + timedelta(hours=24),
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return StoryView_(
        id=story.id, media_url=story.media_url, media_type=story.media_type,
        content=story.content, created_at=story.created_at, expires_at=story.expires_at,
        view_count=0, my_viewed=False,
    )


@feed.post("/stories/{story_id}/react")
async def react_story(
    story_id: str,
    body: ReactRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    existing = await db.scalar(select(StoryReaction).where(StoryReaction.story_id == story_id, StoryReaction.user_id == user.id))
    if existing and existing.emoji == body.emoji:
        await db.delete(existing)
        await db.commit()
        my_reaction = None
    elif existing:
        existing.emoji = body.emoji
        await db.commit()
        my_reaction = body.emoji
    else:
        db.add(StoryReaction(id=new_id(), story_id=story_id, user_id=user.id, emoji=body.emoji))
        await db.commit()
        my_reaction = body.emoji
    count = int((await db.scalar(select(func.count(StoryReaction.id)).where(StoryReaction.story_id == story_id))) or 0)
    all_reactions = (await db.scalars(select(StoryReaction).where(StoryReaction.story_id == story_id))).all()
    rmap: dict[str, str] = {}
    for r in all_reactions:
        rmap[r.user_id] = r.emoji
    rusers = list(rmap.keys())
    ruser_map: dict[str, User] = {}
    if rusers:
        rows = (await db.scalars(select(User).where(User.id.in_(rusers)))).all()
        ruser_map = {r.id: r for r in rows}
    reaction_views = [StoryReactionView(emoji=emoji, user_id=uid, display_name=ruser_map.get(uid, None) and ruser_map[uid].display_name, avatar_url=ruser_map.get(uid, None) and ruser_map[uid].avatar_url) for uid, emoji in rmap.items()]
    if story.author_id != user.id:
        await manager.send_user(story.author_id, {
            "type": "story.reacted",
            "story_id": story_id,
            "user_id": user.id,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "emoji": body.emoji,
            "reaction_count": count,
        })
    return StoryReactionResponse(emoji=body.emoji, reaction_count=count, my_reaction=my_reaction, reactions=reaction_views)


@feed.get("/stories/{story_id}/reactions")
async def get_story_reactions(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    all_reactions = (await db.scalars(select(StoryReaction).where(StoryReaction.story_id == story_id))).all()
    my_reaction_obj = await db.scalar(select(StoryReaction).where(StoryReaction.story_id == story_id, StoryReaction.user_id == user.id))
    rmap: dict[str, str] = {}
    for r in all_reactions:
        rmap[r.user_id] = r.emoji
    rusers = list(rmap.keys())
    ruser_map: dict[str, User] = {}
    if rusers:
        rows = (await db.scalars(select(User).where(User.id.in_(rusers)))).all()
        ruser_map = {r.id: r for r in rows}
    reaction_views = [StoryReactionView(emoji=emoji, user_id=uid, display_name=ruser_map.get(uid, None) and ruser_map[uid].display_name, avatar_url=ruser_map.get(uid, None) and ruser_map[uid].avatar_url) for uid, emoji in rmap.items()]
    return StoryReactionResponse(emoji=my_reaction_obj.emoji if my_reaction_obj else "", reaction_count=len(all_reactions), my_reaction=my_reaction_obj.emoji if my_reaction_obj else None, reactions=reaction_views)


@feed.post("/stories/{story_id}/reply", status_code=201)
async def reply_story(
    story_id: str,
    body: CreateCommentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    reply = StoryReply(id=new_id(), story_id=story_id, sender_id=user.id, content=body.content or None)
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    view = StoryReplyView(id=reply.id, sender=UserPublic.model_validate(user), content=reply.content, created_at=reply.created_at)
    await manager.send_user(story.author_id, {
        "type": "story.replied",
        "story_id": story_id,
        "reply": {"id": reply.id, "sender_id": user.id, "sender_name": user.display_name, "sender_avatar": user.avatar_url, "content": reply.content, "created_at": str(reply.created_at)},
    })
    return view


@feed.get("/stories/{story_id}/replies")
async def story_replies(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != user.id:
        raise HTTPException(status_code=403, detail="Only story owner can see replies")
    replies = (await db.scalars(
        select(StoryReply).where(StoryReply.story_id == story_id).order_by(StoryReply.created_at.asc())
    )).all()
    result = []
    for r in replies:
        u = await db.get(User, r.sender_id)
        if u:
            result.append(StoryReplyView(id=r.id, sender=UserPublic.model_validate(u), content=r.content, created_at=r.created_at))
    return result


@feed.delete("/stories/{story_id}")
async def delete_story(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story or story.author_id != user.id:
        raise HTTPException(status_code=404, detail="Story not found")
    await db.delete(story)
    await db.commit()
    return {"ok": True}


@feed.post("/stories/{story_id}/view")
async def view_story(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    existing = await db.scalar(select(StoryView).where(StoryView.story_id == story_id, StoryView.viewer_id == user.id))
    if not existing:
        db.add(StoryView(id=new_id(), story_id=story_id, viewer_id=user.id, viewed_at=utcnow()))
        await db.commit()
    vc = int((await db.scalar(select(func.count(StoryView.id)).where(StoryView.story_id == story_id))) or 0)
    if story.author_id != user.id:
        await manager.send_user(story.author_id, {
            "type": "story.viewed",
            "story_id": story_id,
            "user_id": user.id,
            "display_name": user.display_name,
        })
    return {"view_count": vc}


@feed.get("/stories/{story_id}/viewers")
async def story_viewers(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != user.id:
        raise HTTPException(status_code=403, detail="Only story owner can see viewers")
    viewers = (await db.scalars(
        select(StoryView).where(StoryView.story_id == story_id).order_by(StoryView.viewed_at.desc())
    )).all()
    result = []
    for v in viewers:
        u = await db.get(User, v.viewer_id)
        if u:
            result.append(StoryViewUser(id=u.id, display_name=u.display_name, avatar_url=u.avatar_url, viewed_at=v.viewed_at))
    return result


@feed.get("/users/{user_id}/posts", response_model=PostPage)
async def user_posts(
    user_id: str,
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    q = select(Post).where(Post.author_id == user_id, Post.deleted_at.is_(None)).order_by(Post.created_at.desc()).limit(limit + 1)
    if cursor:
        cur = await db.get(Post, cursor)
        if cur:
            q = q.where(Post.created_at < cur.created_at)
    posts = (await db.scalars(q)).all()
    has_next = len(posts) > limit
    items = [await _post_view(db, p, user) for p in posts[:limit]]
    return PostPage(items=items, next_cursor=posts[limit].id if has_next else None)


# ── Follow / Profile ────────────────────────────────────────────


@feed.post("/users/{user_id}/follow", response_model=FollowResponse)
async def toggle_follow(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = await db.scalar(select(Follow).where(Follow.follower_id == user.id, Follow.following_id == user_id))
    if existing:
        await db.delete(existing)
        await db.commit()
    else:
        follow = Follow(id=new_id(), follower_id=user.id, following_id=user_id)
        db.add(follow)
        await db.commit()
    fc = int((await db.scalar(select(func.count(Follow.id)).where(Follow.following_id == user_id))) or 0)
    fgc = int((await db.scalar(select(func.count(Follow.id)).where(Follow.follower_id == user_id))) or 0)
    return FollowResponse(following=not bool(existing), follower_count=fc, following_count=fgc)


@feed.get("/users/{user_id}/followers", response_model=FollowListPage)
async def list_followers(
    user_id: str,
    cursor: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Follow).where(Follow.following_id == user_id).order_by(Follow.created_at.desc()).limit(30)
    if cursor:
        cur = await db.get(Follow, cursor)
        if cur:
            q = q.where(Follow.created_at < cur.created_at)
    follows = (await db.scalars(q)).all()
    items = []
    for f in follows:
        u = await db.get(User, f.follower_id)
        if u:
            items.append(FollowUserView(
                id=u.id, username=u.username, display_name=u.display_name, bio=u.bio,
                avatar_url=u.avatar_url, is_online=u.is_online, last_seen_at=u.last_seen_at,
                followed_at=f.created_at,
            ))
    return FollowListPage(items=items, next_cursor=follows[-1].id if len(follows) == 30 else None)


@feed.get("/users/{user_id}/following", response_model=FollowListPage)
async def list_following(
    user_id: str,
    cursor: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Follow).where(Follow.follower_id == user_id).order_by(Follow.created_at.desc()).limit(30)
    if cursor:
        cur = await db.get(Follow, cursor)
        if cur:
            q = q.where(Follow.created_at < cur.created_at)
    follows = (await db.scalars(q)).all()
    items = []
    for f in follows:
        u = await db.get(User, f.following_id)
        if u:
            items.append(FollowUserView(
                id=u.id, username=u.username, display_name=u.display_name, bio=u.bio,
                avatar_url=u.avatar_url, is_online=u.is_online, last_seen_at=u.last_seen_at,
                followed_at=f.created_at,
            ))
    return FollowListPage(items=items, next_cursor=follows[-1].id if len(follows) == 30 else None)


@feed.get("/users/{user_id}/profile", response_model=UserProfileView)
async def user_profile(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    fc = int((await db.scalar(select(func.count(Follow.id)).where(Follow.following_id == user_id))) or 0)
    fgc = int((await db.scalar(select(func.count(Follow.id)).where(Follow.follower_id == user_id))) or 0)
    pc = int((await db.scalar(select(func.count(Post.id)).where(Post.author_id == user_id, Post.deleted_at.is_(None)))) or 0)
    is_following = bool(await db.scalar(select(Follow).where(Follow.follower_id == user.id, Follow.following_id == user_id)))

    my_following = set((await db.scalars(select(Follow.following_id).where(Follow.follower_id == user.id))).all())
    their_followers = set((await db.scalars(select(Follow.follower_id).where(Follow.following_id == user_id))).all())
    mutual = len(my_following & their_followers)

    pv = int((await db.scalar(select(func.count(ProfileView.id)).where(ProfileView.profile_id == user_id))) or 0)

    return UserProfileView(
        user=UserPublic.model_validate(target),
        follower_count=fc, following_count=fgc, post_count=pc,
        is_following=is_following, is_self=user.id == user_id,
        mutual_friend_count=mutual, profile_view_count=pv,
    )


@feed.get("/users/{user_id}/media", response_model=ProfileMediaPage)
async def user_media(
    user_id: str,
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    q = (
        select(PostMedia, Post.created_at)
        .join(Post, PostMedia.post_id == Post.id)
        .where(
            Post.author_id == user_id, Post.deleted_at.is_(None),
            or_(PostMedia.mime_type.ilike("%video%"), PostMedia.mime_type.ilike("%image%"))
        )
        .order_by(Post.created_at.desc())
        .limit(30)
    )
    if cursor:
        c = await db.get(Post, cursor)
        if c:
            q = q.where(Post.created_at < c.created_at)
    rows = (await db.execute(q)).all()
    items = [ProfileMediaItem(id=pm.id, url=pm.url, mime_type=pm.mime_type, post_id=pm.post_id, created_at=ca) for pm, ca in rows]
    return ProfileMediaPage(items=items, next_cursor=items[-1].id if len(items) == 30 else None)


@feed.get("/users/{user_id}/likes", response_model=PostPage)
async def user_likes(
    user_id: str,
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    q = (
        select(Post)
        .join(PostLike, PostLike.post_id == Post.id)
        .where(PostLike.user_id == user_id, Post.deleted_at.is_(None))
        .order_by(Post.created_at.desc())
        .limit(20)
    )
    if cursor:
        c = await db.get(Post, cursor)
        if c:
            q = q.where(Post.created_at < c.created_at)
    posts = (await db.scalars(q)).all()
    items = []
    for p in posts:
        items.append(await _post_view(db, p, user))
    return PostPage(items=items, next_cursor=posts[-1].id if len(posts) == 20 else None)


@feed.get("/users/{user_id}/highlights", response_model=HighlightListPage)
async def user_highlights(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    highlights = (await db.scalars(
        select(StoryHighlight)
        .where(StoryHighlight.user_id == user_id)
        .order_by(StoryHighlight.sort_order, StoryHighlight.created_at.desc())
    )).all()
    items = []
    for h in highlights:
        sc = int((await db.scalar(select(func.count(StoryHighlightItem.id)).where(StoryHighlightItem.highlight_id == h.id))) or 0)
        items.append(HighlightView(id=h.id, title=h.title, cover_url=h.cover_url, sort_order=h.sort_order, story_count=sc, created_at=h.created_at))
    return HighlightListPage(items=items, next_cursor=None)


@feed.post("/users/{user_id}/highlights", response_model=HighlightView)
async def create_highlight(
    user_id: str,
    body: HighlightCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot create highlights for other users")
    h = StoryHighlight(id=new_id(), user_id=user_id, title=body.title, cover_url=body.cover_url)
    db.add(h)
    await db.commit()
    return HighlightView(id=h.id, title=h.title, cover_url=h.cover_url, sort_order=0, story_count=0, created_at=h.created_at)


@feed.delete("/users/{user_id}/highlights/{highlight_id}")
async def delete_highlight(
    user_id: str,
    highlight_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete other users' highlights")
    h = await db.get(StoryHighlight, highlight_id)
    if not h or h.user_id != user_id:
        raise HTTPException(status_code=404, detail="Highlight not found")
    await db.delete(h)
    await db.commit()
    return {"ok": True}
