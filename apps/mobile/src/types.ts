export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  phoneCode?: string | null;
  phone?: string | null;
  remark?: string | null;
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
  | { type: 'call.hangup' | 'call.decline'; conversationId: string; userId: string }
  | { type: 'connected' | 'disconnected' };
