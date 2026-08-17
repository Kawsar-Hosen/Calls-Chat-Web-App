from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models import (CommentLike, Friendship, MediaAttachment, Post, PostBookmark, PostComment, PostLike,
                        PostMedia, PostShare, Story, StoryView, User, new_id, utcnow)
from app.schemas import (BookmarkResponse, CommentPage, CommentView, CommentReactionView,
                         CreateCommentRequest, CreatePostRequest, CreateStoryRequest, PostPage,
                         PostReactionView, PostView, PostMediaView, ReactRequest, ReactResponse,
                         ShareResponse, StoryGroupView, StoryView_, UserPublic)
from app.push import push_to_users
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
    return PostView(
        id=post.id,
        author=UserPublic.model_validate(author),
        content=post.content,
        visibility=post.visibility,
        media=[PostMediaView.model_validate(m) for m in media],
        reactions=[PostReactionView.model_validate(r) for r in reactions],
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
    return ReactResponse(
        like_count=like_count,
        my_like_emoji=my_like.emoji if my_like else None,
        reactions=[PostReactionView.model_validate(r) for r in reactions],
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
    # Get friend IDs
    low = select(Friendship.user_low_id).where(or_(Friendship.user_low_id == user.id, Friendship.user_high_id == user.id))
    high = select(Friendship.user_high_id).where(or_(Friendship.user_low_id == user.id, Friendship.user_high_id == user.id))
    friend_ids = list((await db.scalars(low.union(high))).all())

    # Include self + friends, non-expired stories
    author_ids = [user.id] + [fid for fid in friend_ids if fid != user.id]
    q = (
        select(Story)
        .where(Story.author_id.in_(author_ids), Story.expires_at > now)
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
    att = await db.get(PostMedia, body.media_id)
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
    return {"view_count": vc}


@feed.get("/stories/{story_id}/viewers")
async def story_viewers(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story = await db.get(Story, story_id)
    if not story or story.author_id != user.id:
        raise HTTPException(status_code=404, detail="Story not found")
    views = (await db.scalars(select(StoryView).where(StoryView.story_id == story_id))).all()
    viewers = []
    for v in views:
        u = await db.get(User, v.viewer_id)
        if u:
            viewers.append(UserPublic.model_validate(u))
    return viewers
