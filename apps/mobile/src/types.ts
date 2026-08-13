export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
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
  isBlocked: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
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
  | { type: 'group.updated'; groupId: string }
  | { type: 'group.deleted'; groupId: string }
  | { type: 'group.member.removed'; groupId: string; userId: string }
  | { type: 'group.member.added'; groupId: string; userId: string }
  | { type: 'connected' | 'disconnected' };
