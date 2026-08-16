# XYTEEE Social Feed Feature — Full Plan

## Overview
Facebook/Instagram-inspired social feed with posts, reactions, comments, shares, stories, and bookmarks. Two feed sections: **Friends** (private) + **Explore** (public). Mobile-first, theme-aware, real-time via WebSocket.

---

## 1. Database Tables (9 new tables in `models.py`)

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| author_id | VARCHAR(36) FK → users | NOT NULL |
| content | TEXT | Post text body, nullable (media-only posts) |
| visibility | VARCHAR(10) | `'friends'` or `'public'`, default `'public'` |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | nullable |
| deleted_at | TIMESTAMP | soft delete |

Index: `(author_id, created_at DESC)`, `(visibility, created_at DESC)`

### `post_media`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| post_id | VARCHAR(36) FK → posts | ON DELETE CASCADE |
| url | VARCHAR(500) | |
| mime_type | VARCHAR(50) | image/jpeg, video/mp4, etc |
| sort_order | INT | 0-based |

### `post_likes`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| post_id | VARCHAR(36) FK → posts | ON DELETE CASCADE |
| user_id | VARCHAR(36) FK → users | ON DELETE CASCADE |
| emoji | VARCHAR(10) | default `'👍'` — supports 👍❤️😂😮😢🔥 |
| created_at | TIMESTAMP | |
| UNIQUE | (post_id, user_id) | one reaction per user per post |

### `post_comments`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| post_id | VARCHAR(36) FK → posts | ON DELETE CASCADE |
| author_id | VARCHAR(36) FK → users | |
| content | TEXT | NOT NULL |
| parent_id | VARCHAR(36) FK → post_comments | nullable — for reply threads |
| created_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | soft delete |

Index: `(post_id, created_at)`

### `comment_likes`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| comment_id | VARCHAR(36) FK → post_comments | ON DELETE CASCADE |
| user_id | VARCHAR(36) FK → users | ON DELETE CASCADE |
| created_at | TIMESTAMP | |
| UNIQUE | (comment_id, user_id) | |

### `post_shares`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| post_id | VARCHAR(36) FK → posts | ON DELETE CASCADE |
| user_id | VARCHAR(36) FK → users | ON DELETE CASCADE |
| created_at | TIMESTAMP | |
| UNIQUE | (post_id, user_id) | one share per user |

### `post_bookmarks`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| post_id | VARCHAR(36) FK → posts | ON DELETE CASCADE |
| user_id | VARCHAR(36) FK → users | ON DELETE CASCADE |
| created_at | TIMESTAMP | |
| UNIQUE | (post_id, user_id) | |

### `stories`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| author_id | VARCHAR(36) FK → users | |
| content | TEXT | nullable — text overlay |
| media_url | VARCHAR(500) | image or video |
| media_type | VARCHAR(10) | `'image'` or `'video'` |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | created_at + 24 hours |

Index: `(author_id, created_at DESC)`, `(expires_at)` — for cleanup

### `story_views`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | UUID |
| story_id | VARCHAR(36) FK → stories | ON DELETE CASCADE |
| viewer_id | VARCHAR(36) FK → users | ON DELETE CASCADE |
| viewed_at | TIMESTAMP | |
| UNIQUE | (story_id, viewer_id) | |

---

## 2. Backend API Endpoints (`routes.py`)

### Feed
| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed?section=friends\|public&cursor=&limit=20` | Paginated feed. `section=friends` returns posts from friends only. `section=public` returns all public posts. Each post includes: author, media, like_count, comment_count, share_count, my_like_emoji, my_bookmarked |
| GET | `/feed/stories` | Get active (non-expired) stories grouped by author. Returns `[{author, stories: [{id, media_url, media_type, content, created_at, view_count, my_viewed}]}]` |

### Posts CRUD
| Method | Path | Description |
|--------|------|-------------|
| POST | `/posts` | Create post. Body: `{content?, media_ids?: string[], visibility: 'friends'\|'public'}`. Returns full post object |
| GET | `/posts/{id}` | Get single post with all counts + my reactions |
| PATCH | `/posts/{id}` | Edit post content (owner only). Body: `{content}` |
| DELETE | `/posts/{id}` | Soft delete post (owner only) |
| GET | `/users/{id}/posts?cursor=&limit=20` | Get a user's posts |

### Post Reactions (Like)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/posts/{id}/react` | Toggle/add reaction. Body: `{emoji: '👍'}`. Same emoji = remove. Different emoji = change. Returns updated counts |

### Comments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/posts/{id}/comments?cursor=&limit=20` | Get comments (top-level first, replies nested). Returns `{items: [...], nextCursor}` |
| POST | `/posts/{id}/comments` | Add comment. Body: `{content, parent_id?}` |
| DELETE | `/posts/{id}/comments/{comment_id}` | Delete comment (author or post owner) |
| POST | `/posts/{id}/comments/{comment_id}/react` | Toggle comment like. Body: `{emoji: '👍'}` |

### Shares
| Method | Path | Description |
|--------|------|-------------|
| POST | `/posts/{id}/share` | Share/repost. Creates a `post_shares` record. Returns updated share_count + my_shared |

### Bookmarks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/posts/{id}/bookmark` | Toggle bookmark. Returns updated my_bookmarked |
| GET | `/bookmarks?cursor=&limit=20` | Get bookmarked posts |

### Stories
| Method | Path | Description |
|--------|------|-------------|
| POST | `/stories` | Create story. Body: `{media_id, content?}`. Auto-expires in 24h |
| DELETE | `/stories/{id}` | Delete own story |
| POST | `/stories/{id}/view` | Mark story as viewed. Returns view_count |
| GET | `/stories/{id}/viewers` | Get list of viewers (for own stories) |

### Media (extend existing)
Existing `/media/upload` already handles image/video. Post creation will reference `media_ids` from uploaded `MediaAttachment` records.

---

## 3. WebSocket Events (extend `socket.py`)

### New events to broadcast:
| Event | Payload | When |
|-------|---------|------|
| `post.created` | Full post object | New post created |
| `post.updated` | Post id + changes | Post edited |
| `post.deleted` | Post id | Post deleted |
| `comment.created` | `{post_id, comment}` | New comment |
| `comment.deleted` | `{post_id, comment_id}` | Comment deleted |
| `reaction.updated` | `{post_id, user_id, emoji, like_count}` | Post reaction toggled |
| `story.created` | Story object | New story |
| `story.deleted` | Story id | Story deleted |

### Broadcast rules:
- `post.created`: broadcast to author's friends (if friends-only) or all users (if public)
- `comment.created`: broadcast to post author + people who commented on the same post
- `reaction.updated`: broadcast to post author
- `story.created`: broadcast to author's friends

---

## 4. Mobile Types (`types.ts`)

```typescript
// ===== FEED =====
export interface PostMedia {
  id: string;
  url: string;
  mimeType: string;
  sortOrder: number;
}

export interface PostReaction {
  emoji: string;
  userId: string;
}

export interface PostComment {
  id: string;
  postId: string;
  author: User;
  content: string;
  parentId: string | null;
  reactions: PostReaction[];
  reactionCount: number;
  replyCount: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface Post {
  id: string;
  author: User;
  content: string | null;
  visibility: 'friends' | 'public';
  media: PostMedia[];
  reactions: PostReaction[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  myLikeEmoji: string | null;
  myBookmarked: boolean;
  myShared: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  content: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  myViewed: boolean;
}

export interface StoryGroup {
  author: User;
  stories: Story[];
  hasUnviewed: boolean;
}
```

---

## 5. New Tab — Feed

### `_layout.tsx` change:
Add 4th tab: **Feed** — first position (before Conversations).

```
Feed | Messages | Contacts | Settings
🏠    💬         👥         ⚙️
```

Feed tab icon: `home-outline` / `home` (active)

---

## 6. Mobile Screens (New)

### Screen: `(tabs)/feed.tsx` — Main Feed
- **Stories row** at top: horizontally scrollable ring of story circles
  - First circle = "Your story" with + icon (no active story) or your avatar (has story)
  - Each circle: author avatar + name, colored ring (unviewed = gradient, viewed = gray)
  - Tap = open Story Viewer
- **Section tabs**: "Friends" | "Explore" — toggle between friends-only and public feed
- **Post list** (FlatList, infinite scroll):
  - Post card component (see below)
  - Pull-to-refresh
  - Skeleton loading
- **FAB** (Floating Action Button): `+` circle, bottom-right, opens Create Post screen

### Component: `PostCard`
```
┌──────────────────────────────────────┐
│ [Avatar] Name          ··· menu     │
│          2h ago · 🌐/👥              │
│                                      │
│ Post text content here...            │
│                                      │
│ ┌────────┐ ┌────────┐               │
│ │ Image1 │ │ Image2 │  (grid layout)│
│ └────────┘ └────────┘               │
│                                      │
│ 👍 12  💬 5  ↗ 3     ♡ · 💬 · ↗ · 🔖│
│                                      │
│ Reactions row: 👍❤️🔥 (3 avatars)   │
│ "View all 5 comments"               │
└──────────────────────────────────────┘
```

- Avatar + displayName + relative time + visibility badge
- Content text (expandable "see more" for long text)
- Media grid: 1 image = full width, 2 = side by side, 3+ = 2-column grid
- Action bar: Like (with emoji picker), Comment, Share, Bookmark
- Reaction summary: avatars + emoji + count
- Comment preview: "View all N comments"
- Long press = reaction picker modal

### Screen: `(auth)/create-post.tsx` — Create Post (modal)
- Header: X (close) | "New Post" | Post button
- User avatar + name at top
- TextInput: multiline, "What's on your mind?"
- Media picker: gallery button, supports image + video
- Selected media preview (removable, reorderable)
- Visibility toggle: 👥 Friends | 🌐 Public
- Character count (optional limit)

### Screen: `(tabs)/feed/[id].tsx` — Post Detail
- Full PostCard at top
- Comments list below (with replies nested)
- Comment input bar at bottom (fixed)
- Pull-to-refresh

### Component: `CommentsSheet` (Modal Bottom Sheet)
- FlatList of comments
- Each comment: avatar + name + text + time + like button + reply button
- Nested replies (1 level deep, indented)
- "Write a comment..." input at bottom
- Comment count header

### Component: `ReactionPicker` (Modal)
- Grid of emoji options: 👍 ❤️ 😂 😮 😢 🔥
- Tap to select, tap again to deselect
- Haptic feedback

### Component: `ShareSheet` (Modal Bottom Sheet)
- "Share to your story" option
- "Copy link" option
- "Share to [friend]" — list of recent conversations
- Share count display

### Screen: `story/[id].tsx` — Story Viewer
- Full-screen media (image or video)
- Progress bars at top (one per story in group, animated)
- Author avatar + name + time
- Tap right = next, tap left = previous
- Swipe down = close
- Text overlay (if content provided)
- Reply input at bottom (optional)
- Seen indicator: eye icon + view count (for own stories)
- Auto-advance after 5s (images) or video end
- Stories from same author play sequentially, then move to next author

---

## 7. API Client Methods (`api.ts`)

```typescript
// Feed
feed(section: 'friends' | 'public', cursor?: string, limit?: number): Promise<{items: Post[], nextCursor: string | null}>
feedStories(): Promise<StoryGroup[]>

// Posts
createPost(data: {content?: string, mediaIds?: string[], visibility: 'friends' | 'public'}): Promise<Post>
getPost(postId: string): Promise<Post>
editPost(postId: string, content: string): Promise<Post>
deletePost(postId: string): Promise<void>
userPosts(userId: string, cursor?: string): Promise<{items: Post[], nextCursor: string | null}>

// Reactions
reactPost(postId: string, emoji: string): Promise<{likeCount: number, myLikeEmoji: string | null, reactions: PostReaction[]}>

// Comments
postComments(postId: string, cursor?: string): Promise<{items: PostComment[], nextCursor: string | null}>
addComment(postId: string, content: string, parentId?: string): Promise<PostComment>
deleteComment(postId: string, commentId: string): Promise<void>
reactComment(postId: string, commentId: string, emoji: string): Promise<{reactionCount: number, myReaction: string | null}>

// Shares
sharePost(postId: string): Promise<{shareCount: number, myShared: boolean}>

// Bookmarks
bookmarkPost(postId: string): Promise<{myBookmarked: boolean}>
bookmarks(cursor?: string): Promise<{items: Post[], nextCursor: string | null}>

// Stories
createStory(mediaId: string, content?: string): Promise<Story>
deleteStory(storyId: string): Promise<void>
viewStory(storyId: string): Promise<{viewCount: number}>
storyViewers(storyId: string): Promise<User[]>
```

---

## 8. i18n Keys (7 languages × ~30 keys)

New keys:
```
feed, feedTitle, friends, explore, createPost, newPost, whatsOnYourMind,
postContent, postButton, posting, visibility, friendsOnly, publicPost,
reactions, like, comment, share, repost, bookmark, bookmarks,
viewAllComments, writeComment, addComment, reply, replyTo,
comments, noComments, postDeleted, postEdited,
stories, yourStory, viewStory, storyExpired, storyViewers,
shareToStory, copyLink, shareToFriend, shared,
createStory, addText, image, video, photo, camera,
postOptionsMenu, editPost, deletePost, deleteConfirm,
noPostsYet, loadingFeed, pullToRefresh
```

---

## 9. Backend Schemas (`schemas.py`)

New Pydantic models:
```python
# Posts
class CreatePostRequest(BaseModel):
    content: str | None = None
    media_ids: list[str] = []
    visibility: Literal['friends', 'public'] = 'public'

class PostMediaOut(BaseModel):
    id: str
    url: str
    mime_type: str
    sort_order: int

class PostReactionOut(BaseModel):
    emoji: str
    user_id: str

class PostOut(BaseModel):
    id: str
    author: UserOut
    content: str | None
    visibility: str
    media: list[PostMediaOut]
    reactions: list[PostReactionOut]
    like_count: int
    comment_count: int
    share_count: int
    my_like_emoji: str | None
    my_bookmarked: bool
    my_shared: bool
    created_at: datetime
    updated_at: datetime | None

# Comments
class CreateCommentRequest(BaseModel):
    content: str
    parent_id: str | None = None

class CommentOut(BaseModel):
    id: str
    post_id: str
    author: UserOut
    content: str
    parent_id: str | None
    reactions: list[PostReactionOut]
    reaction_count: int
    reply_count: int
    created_at: datetime

# Reactions
class ReactRequest(BaseModel):
    emoji: str = '👍'

# Stories
class CreateStoryRequest(BaseModel):
    media_id: str
    content: str | None = None

class StoryOut(BaseModel):
    id: str
    media_url: str
    media_type: str
    content: str | None
    created_at: datetime
    expires_at: datetime
    view_count: int
    my_viewed: bool

class StoryGroupOut(BaseModel):
    author: UserOut
    stories: list[StoryOut]
    has_unviewed: bool
```

---

## 10. File Changes Summary

### New files:
| File | Purpose |
|------|---------|
| `apps/mobile/app/(tabs)/feed.tsx` | Main feed screen |
| `apps/mobile/app/feed/[id].tsx` | Post detail screen |
| `apps/mobile/app/feed/create.tsx` | Create post screen |
| `apps/mobile/app/story/[id].tsx` | Story viewer screen |
| `apps/mobile/src/components/PostCard.tsx` | Post card component |
| `apps/mobile/src/components/CommentSheet.tsx` | Comments bottom sheet |
| `apps/mobile/src/components/ReactionPicker.tsx` | Emoji reaction picker |
| `apps/mobile/src/components/ShareSheet.tsx` | Share bottom sheet |
| `apps/mobile/src/components/StoryRing.tsx` | Stories row component |
| `apps/mobile/src/components/StoryViewer.tsx` | Full screen story viewer |
| `apps/mobile/src/components/CreatePostFAB.tsx` | Floating action button |

### Modified files:
| File | Changes |
|------|---------|
| `apps/api/app/models.py` | Add 9 new tables |
| `apps/api/app/schemas.py` | Add ~20 new Pydantic models |
| `apps/api/app/api/routes.py` | Add ~20 new endpoints |
| `apps/api/app/ws.py` (or routes.py ws handler) | Add post/story broadcast events |
| `apps/mobile/src/types.ts` | Add Post, Story, Comment types |
| `apps/mobile/src/api.ts` | Add ~20 new API methods |
| `apps/mobile/src/i18n.tsx` | Add ~30 new keys × 7 languages |
| `apps/mobile/app/(tabs)/_layout.tsx` | Add Feed tab |
| `apps/mobile/app/(tabs)/_layout.tsx` | Reorder tabs: Feed first |
| `apps/mobile/src/socket.tsx` | Handle post/story/comment events |
| `apps/mobile/app/_layout.tsx` | (if needed for feed routes) |

---

## 11. Build Order (Implementation Phases)

### Phase 1: Backend Foundation
1. Add 9 new models to `models.py`
2. Add Pydantic schemas to `schemas.py`
3. Create tables on Neon (via create_all or manual SQL)
4. Add CRUD endpoints: posts, comments, reactions, shares, bookmarks
5. Add feed endpoint (friends + public sections)
6. Add story endpoints
7. Test with pytest

### Phase 2: Mobile Types + API
1. Add TypeScript types to `types.ts`
2. Add API methods to `api.ts`
3. Add i18n keys (all 7 languages)
4. Update socket handler for new events

### Phase 3: Mobile UI — Feed Tab
1. Add Feed tab to `_layout.tsx`
2. Build PostCard component
3. Build StoryRing component
4. Build feed screen with sections (Friends/Explore)
5. Add infinite scroll + pull-to-refresh + skeleton

### Phase 4: Mobile UI — Post Interactions
1. Build ReactionPicker
2. Build CommentSheet
3. Build ShareSheet
4. Wire reactions, comments, shares to PostCard
5. Build PostDetail screen

### Phase 5: Mobile UI — Create Post + Stories
1. Build CreatePost screen (modal)
2. Build StoryViewer
3. Build CreateStory flow
4. Wire story ring to viewer

### Phase 6: Polish + Real-time
1. Socket events for live updates
2. Push notifications for post interactions
3. Optimistic UI updates
4. Image/video grid layouts
5. Edge cases: empty states, error handling, loading states

---

## 12. Design Guidelines

- **No copying Facebook** — clean minimal design, using existing XYTEEE theme
- **Theme-aware**: all colors from `useTheme()` — works in dark + light
- **RTL support**: `isRTL` aware layouts
- **Consistent border-radius**: 12-16px cards, 20-23px avatars
- **Animations**: use `react-native-reanimated` for smooth transitions
- **Mobile-first**: all touch targets ≥ 44px, pull-to-refresh, infinite scroll
- **Performance**: FlatList with `getItemLayout`, image caching, lazy loading
