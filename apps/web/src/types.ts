export type Presence = 'online' | 'away' | 'offline';
export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  bio?: string;
  presence?: Presence;
  lastSeen?: string | null;
  isFriend?: boolean;
  requestStatus?: 'incoming' | 'outgoing' | null;
  isBlocked?: boolean;
  remark?: string | null;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
  userIds?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  body: string;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
  replyTo?: Pick<Message, 'id' | 'body' | 'sender'> | null;
  reactions: Reaction[];
  attachments: Attachment[];
  delivery: DeliveryState;
}

export interface Conversation {
  id: string;
  title?: string | null;
  kind: 'direct' | 'group';
  group?: GroupSummary | null;
  participants: User[];
  lastMessage?: Message | null;
  unreadCount: number;
  updatedAt: string;
  typingUserIds?: string[];
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
  description?: string | null;
  avatarUrl?: string | null;
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

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export type SocketEvent =
  | { type: 'message.created'; payload: Message }
  | { type: 'message.updated'; payload: Message }
  | { type: 'message.deleted'; payload: { conversationId: string; messageId: string } }
  | { type: 'reaction.updated'; payload: Message }
  | { type: 'conversation.updated'; payload: Conversation }
  | { type: 'typing.started' | 'typing.stopped'; payload: { conversationId: string; userId: string } }
  | { type: 'presence.updated'; payload: { userId: string; presence: Presence; lastSeen?: string } }
  | { type: 'message.delivery'; payload: { messageId: string; delivery: DeliveryState } }
  | { type: 'group.updated'; payload: Group }
  | { type: 'group.deleted'; payload: { groupId: string; conversationId: string } }
  | { type: 'group.member.removed'; payload: { groupId: string; conversationId: string; userId: string } }
  | { type: 'group.member.added'; payload: { groupId: string; conversationId: string; userId: string } }
  | { type: 'error'; payload: { message: string } };
