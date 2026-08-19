export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  customStatus?: string | null;
  accentColor?: string | null;
  location?: string | null;
  website?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  isVerified?: boolean;
  verifiedCategory?: string;
  role?: string;
  isBanned?: boolean;
  banReason?: string | null;
  verifiedAt?: string | null;
  verifiedUntil?: string | null;
  bannedAt?: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastSeenVisible?: boolean;
  onlineVisible?: boolean;
  whoCanMessage?: string;
  whoCanSeePosts?: string;
  readReceipts?: boolean;
  typingIndicator?: boolean;
  fontSize?: string;
  fontStyle?: string;
  chatWallpaper?: string | null;
  phoneCode?: string | null;
  phone?: string | null;
  facebookId?: string | null;
  remark?: string | null;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title?: string;
  group?: GroupSummary | null;
  members: User[];
  unreadCount: number;
  updatedAt: string;
  lastMessage?: Message;
}

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId: string;
  myRole: 'owner' | 'admin' | 'member';
  memberCount: number;
}

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  user: User;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupSettings {
  canSend: 'everyone' | 'admins';
  canSendMedia: 'everyone' | 'admins';
  canAddMembers: 'everyone' | 'admins';
  canEditInfo: 'everyone' | 'admins';
}

export interface GroupCustomization {
  theme: string;
  font: string;
  wallpaper: string;
  bubble: string;
  density: string;
  radius: number;
}

export interface ChatPrefs {
  showTimestamps: boolean;
  showReceipts: boolean;
  showTyping: boolean;
  sound: string;
  customization?: GroupCustomization | null;
  nickname?: string | null;
  sendSound?: string | null;
  notifSound?: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  conversationId: string;
  ownerId: string;
  memberCount: number;
  myRole: GroupRole;
  members: GroupMember[];
  updatedAt: string;
  settings: GroupSettings;
  customization: GroupCustomization | null;
}

export interface GroupApplication {
  id: string;
  groupId: string;
  groupName: string;
  applicant: User;
  status: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  user: User;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
}

export interface UserSearchResult extends User {
  isFriend: boolean;
  requestStatus: 'outgoing' | 'incoming' | null;
  requestId?: string | null;
  isBlocked: boolean;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  replyToId: string | null;
  reactions: Reaction[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments: Attachment[];
  readByCount: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends Tokens {
  user: User;
}

export type SocketEvent =
  | { type: 'message.created' | 'message.updated'; message: Message }
  | { type: 'message.deleted'; message: Message }
  | { type: 'presence.updated'; userId: string; isOnline: boolean; lastSeenAt: string | null }
  | { type: 'typing.start' | 'typing.stop'; conversationId: string; userId: string }
  | { type: 'group.updated'; groupId: string; group?: unknown }
  | { type: 'group.deleted'; groupId: string }
  | { type: 'group.member.removed'; groupId: string; userId: string }
  | { type: 'group.member.added'; groupId: string; userId: string }
  | { type: 'friend.request.accepted'; requesterId: string; recipientId: string }
  | { type: 'friend.request.received'; requesterId: string; recipientId: string }
  | { type: 'friend.request.cancelled'; requesterId: string; recipientId: string }
  | { type: 'friend.request.rejected'; requesterId: string; recipientId: string }
  | { type: 'call.offer'; conversationId: string; userId: string; sdp?: string; kind?: 'audio' | 'video' }
  | { type: 'call.answer'; conversationId: string; userId: string; sdp?: string }
  | { type: 'call.ice'; conversationId: string; userId: string; candidate?: unknown }
  | { type: 'call.hangup'; conversationId: string; userId: string }
  | { type: 'call.decline'; conversationId: string; userId: string; reason?: 'busy' | 'missed' | 'no-answer' | 'declined' }
  | { type: 'post.created'; post: Post }
  | { type: 'post.updated'; post: Post }
  | { type: 'post.deleted'; postId: string }
  | { type: 'comment.created'; postId: string; comment: PostComment }
  | { type: 'comment.deleted'; postId: string; commentId: string }
  | { type: 'reaction.updated'; postId: string; userId: string; emoji: string; likeCount: number }
  | { type: 'story.created'; story: StoryItem }
  | { type: 'story.deleted'; storyId: string }
  | { type: 'story.reacted'; storyId: string; userId: string; displayName: string; avatarUrl: string | null; emoji: string; reactionCount: number }
  | { type: 'story.replied'; storyId: string; replyId: string; senderId: string; senderName: string; senderAvatar: string | null; content: string | null; createdAt: string }
  | { type: 'story.viewed'; storyId: string; userId: string; displayName: string }
  | { type: 'follow.updated'; userId: string; followerCount: number; followingCount: number; isFollowing: boolean }
  | { type: 'connected' | 'disconnected' };


// ── Feed / Posts ────────────────────────────────────────────────


export interface PostMedia {
  id: string;
  url: string;
  mimeType: string;
  sortOrder: number;
}

export interface PostReaction {
  emoji: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
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
}

export interface PostPage {
  items: Post[];
  nextCursor: string | null;
}

export interface CommentPage {
  items: PostComment[];
  nextCursor: string | null;
}

export interface ReactResponse {
  likeCount: number;
  myLikeEmoji: string | null;
  reactions: PostReaction[];
}

export interface ShareResponse {
  shareCount: number;
  myShared: boolean;
}

export interface BookmarkResponse {
  myBookmarked: boolean;
}


// ── Stories ─────────────────────────────────────────────────────


export interface StoryItem {
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
  stories: StoryItem[];
  hasUnviewed: boolean;
}


export interface StoryReactionUser {
  emoji: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StoryReactionResponse {
  emoji: string;
  reactionCount: number;
  myReaction: string | null;
  reactions: StoryReactionUser[];
}

export interface StoryReplyItem {
  id: string;
  sender: User;
  content: string | null;
  createdAt: string;
}

export interface StoryViewerUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
}


// ── Follow ─────────────────────────────────────────────────────


export interface FollowResponse {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

export interface FollowUser extends User {
  followedAt: string;
}

export interface FollowListPage {
  items: FollowUser[];
  nextCursor: string | null;
}

export interface UserProfile {
  user: User;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  mutualFriendCount?: number;
  profileViewCount?: number;
}

export interface StoryHighlight {
  id: string;
  title: string;
  coverUrl: string | null;
  sortOrder: number;
  storyCount: number;
  createdAt: string;
}

export interface StoryHighlightPage {
  items: StoryHighlight[];
  nextCursor: string | null;
}

export interface ProfileMediaItem {
  id: string;
  url: string;
  mimeType: string | null;
  postId: string;
  createdAt: string;
}

export interface ProfileMediaPage {
  items: ProfileMediaItem[];
  nextCursor: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  sortOrder: number;
}

export interface SocialLinkListPage {
  items: SocialLink[];
  nextCursor: string | null;
}

export interface LocationResult {
  display_name: string;
  lat: number;
  lon: number;
}

export interface NotificationPrefs {
  messages: boolean;
  calls: boolean;
  posts: boolean;
  comments: boolean;
  reactions: boolean;
  follows: boolean;
  mentions: boolean;
  groupActivity: boolean;
}

export interface AppNotification {
  id: string;
  fromUserId: string | null;
  fromUserName: string | null;
  fromUserAvatar: string | null;
  fromUserIsVerified: boolean;
  fromUserVerifiedCategory: string | null;
  fromUserVerifiedAt: string | null;
  type: string;
  targetType: string | null;
  targetId: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface SearchResult {
  users: UserSearchResult[];
  posts: { id: string; body: string; authorId: string; createdAt: string }[];
}
