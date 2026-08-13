import type {
  Attachment,
  AuthResponse,
  AuthTokens,
  Conversation,
  FriendRequest,
  Group,
  GroupApplication,
  GroupRole,
  Message,
  Page,
  SocketEvent,
  User,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'xyteee.tokens';
const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

type Json = Record<string, unknown>;
const userCache = new Map<string, User>();

function mapUser(raw: Json): User {
  const avatar = (raw.avatarUrl ?? raw.avatar_url ?? null) as string | null;
  const user: User = {
    id: String(raw.id),
    username: String(raw.username ?? ''),
    displayName: String(raw.displayName ?? raw.display_name ?? raw.username ?? 'Unknown user'),
    presence: raw.is_online === true ? 'online' : 'offline',
    avatarUrl: avatar && avatar.startsWith('/') ? `${API_ORIGIN}${avatar}` : avatar,
    lastSeen: (raw.lastSeen ?? raw.last_seen_at ?? null) as string | null,
    ...(raw.email ? { email: String(raw.email) } : {}),
    ...(raw.bio ? { bio: String(raw.bio) } : {}),
    ...(raw.is_friend !== undefined ? { isFriend: raw.is_friend === true } : {}),
    ...(raw.request_status ? { requestStatus: raw.request_status as 'incoming' | 'outgoing' } : {}),
    ...(raw.is_blocked !== undefined ? { isBlocked: raw.is_blocked === true } : {}),
    ...(raw.remark !== undefined ? { remark: raw.remark ? String(raw.remark) : null } : {}),
  };
  userCache.set(user.id, user);
  return user;
}

function mapGroupMember(raw: Json) {
  return { user: mapUser((raw.user ?? {}) as Json), role: String(raw.role) as GroupRole, joinedAt: String(raw.joined_at ?? raw.joinedAt) };
}

function mapGroup(raw: Json): Group {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: (raw.description ?? null) as string | null,
    avatarUrl: (raw.avatarUrl ?? raw.avatar_url ?? null) as string | null,
    conversationId: String(raw.conversationId ?? raw.conversation_id),
    ownerId: String(raw.ownerId ?? raw.owner_id),
    memberCount: Number(raw.memberCount ?? raw.member_count ?? 0),
    myRole: String(raw.myRole ?? raw.my_role) as GroupRole,
    members: ((raw.members ?? []) as Json[]).map(mapGroupMember),
    updatedAt: String(raw.updatedAt ?? raw.updated_at),
  };
}

function mapReactions(raw: unknown, currentUserId?: string) {
  const grouped = new Map<string, string[]>();
  for (const item of Array.isArray(raw) ? raw as Json[] : []) {
    const emoji = String(item.emoji);
    grouped.set(emoji, [...(grouped.get(emoji) ?? []), String(item.user_id ?? item.userId)]);
  }
  return [...grouped].map(([emoji, userIds]) => ({ emoji, userIds, count: userIds.length, reacted: currentUserId ? userIds.includes(currentUserId) : false }));
}

function mapMessage(raw: Json, currentUserId?: string): Message {
  const senderId = String(raw.senderId ?? raw.sender_id ?? (raw.sender as Json | undefined)?.id ?? '');
  const senderRaw = raw.sender as Json | undefined;
  const sender = senderRaw ? mapUser(senderRaw) : userCache.get(senderId) ?? { id: senderId, username: '', displayName: 'Unknown user' };
  return {
    id: String(raw.id),
    conversationId: String(raw.conversationId ?? raw.conversation_id),
    sender,
    body: String(raw.body ?? raw.content ?? ''),
    createdAt: String(raw.createdAt ?? raw.created_at),
    updatedAt: (raw.updatedAt ?? raw.edited_at ?? null) as string | null,
    deletedAt: (raw.deletedAt ?? raw.deleted_at ?? null) as string | null,
    replyTo: null,
    reactions: mapReactions(raw.reactions, currentUserId),
    attachments: (raw.attachments ?? []) as Attachment[],
    delivery: senderId === currentUserId ? 'sent' : 'delivered',
  };
}

function mapConversation(raw: Json): Conversation {
  const participants = ((raw.participants ?? raw.members ?? []) as Json[]).map(mapUser);
  const rawGroup = (raw.group ?? null) as Json | null;
  return {
    id: String(raw.id),
    kind: String(raw.kind) === 'group' ? 'group' : 'direct',
    title: (raw.title ?? null) as string | null,
    group: rawGroup ? {
      id: String(rawGroup.id),
      name: String(rawGroup.name),
      description: rawGroup.description != null ? String(rawGroup.description) : null,
      avatarUrl: (rawGroup.avatar_url ?? rawGroup.avatarUrl ?? null) as string | null,
      ownerId: String(rawGroup.owner_id ?? rawGroup.ownerId),
      myRole: String(rawGroup.my_role ?? rawGroup.myRole) as 'owner' | 'admin' | 'member',
      memberCount: Number(rawGroup.member_count ?? rawGroup.memberCount ?? participants.length)
    } : null,
    participants,
    unreadCount: Number(raw.unreadCount ?? raw.unread_count ?? 0),
    updatedAt: String(raw.updatedAt ?? raw.updated_at),
    ...(raw.lastMessage || raw.last_message ? { lastMessage: mapMessage((raw.lastMessage ?? raw.last_message) as Json) } : {}),
  };
}

export function mapSocketEvent(raw: Json): SocketEvent | null {
  const type = String(raw.type);
  const messageRaw = (raw.payload ?? raw.message) as Json | undefined;
  if ((type === 'message.created' || type === 'message.updated' || type === 'reaction.updated') && messageRaw) {
    return { type, payload: mapMessage(messageRaw) };
  }
  if (type === 'message.deleted' && messageRaw) {
    const message = mapMessage(messageRaw);
    return { type, payload: { conversationId: message.conversationId, messageId: message.id } };
  }
  if (type === 'typing.start' || type === 'typing.stop') {
    return { type: type === 'typing.start' ? 'typing.started' : 'typing.stopped', payload: { conversationId: String(raw.conversation_id), userId: String(raw.user_id) } };
  }
  if (type === 'presence.updated') {
    return { type, payload: { userId: String(raw.user_id), presence: raw.is_online ? 'online' : 'offline', ...(raw.last_seen_at ? { lastSeen: String(raw.last_seen_at) } : {}) } };
  }
  if (type === 'message.read') {
    return { type: 'message.delivery', payload: { messageId: String(raw.message_id), delivery: 'read' } };
  }
  if (type === 'group.updated' && raw.group) {
    return { type, payload: mapGroup(raw.group as Json) };
  }
  if (type === 'group.deleted') {
    return { type, payload: { groupId: String(raw.group_id), conversationId: String(raw.conversation_id) } };
  }
  if (type === 'group.member.removed' || type === 'group.member.added') {
    return { type, payload: { groupId: String(raw.group_id), conversationId: String(raw.conversation_id), userId: String(raw.user_id) } };
  }
  if (type === 'error') return { type, payload: { message: String(raw.detail ?? raw.message ?? 'Live connection error') } };
  return null;
}

function getStoredTokens(): AuthTokens | null {
  try {
    const value = localStorage.getItem(TOKEN_KEY);
    return value ? (JSON.parse(value) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function storeTokens(tokens: AuthTokens | null) {
  if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKEN_KEY);
}

export function accessToken() {
  return getStoredTokens()?.accessToken ?? null;
}

function normalizeTokens(raw: Json): AuthTokens {
  return {
    accessToken: String(raw.accessToken ?? raw.access_token ?? ''),
    refreshToken: String(raw.refreshToken ?? raw.refresh_token ?? ''),
  };
}

function extractItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const value = raw as Json;
  return (value.items ?? value.results ?? value.data ?? []) as T[];
}

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msg = (detail[0] as { msg?: unknown } | undefined)?.msg;
    if (typeof msg === 'string') return msg;
  }
  return null;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; message?: unknown };
    return messageFromDetail(body.detail ?? body.message) ?? 'Request failed';
  } catch {
    return `Request failed (${response.status})`;
  }
}

let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getStoredTokens()?.refreshToken;
  if (!refreshToken) throw new Error('Your session has expired');

  refreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(await parseError(response));
      const tokens = normalizeTokens((await response.json()) as Json);
      storeTokens(tokens);
      return tokens;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = accessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && retry && getStoredTokens()?.refreshToken) {
    await refreshTokens();
    return request<T>(path, options, false);
  }
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const raw = (await request<Json>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })) as Json;
    const tokens = normalizeTokens(raw);
    storeTokens(tokens);
    return { ...tokens, user: mapUser((raw.user ?? raw.profile) as Json) };
  },
  async register(data: { displayName: string; username: string; email: string; password: string }): Promise<AuthResponse> {
    const raw = await request<Json>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, display_name: data.displayName }),
    });
    const tokens = normalizeTokens(raw);
    storeTokens(tokens);
    return { ...tokens, user: mapUser((raw.user ?? raw.profile) as Json) };
  },
  async me() { return mapUser(await request<Json>('/profile')); },
  async logout() { await request<void>('/auth/logout', { method: 'POST' }); },
  async updateProfile(data: Partial<User>) { return mapUser(await request<Json>('/profile', { method: 'PATCH', body: JSON.stringify({ username: data.username, display_name: data.displayName, bio: data.bio, avatar_url: data.avatarUrl }) })); },
  async uploadAvatar(file: File, onProgress?: (pct: number) => void): Promise<string> {
    const form = new FormData(); form.append('file', file);
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/profile/avatar`);
      const token = accessToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        let url: string | undefined;
        let detail: unknown;
        try {
          const body = JSON.parse(xhr.responseText) as { url?: string; detail?: unknown };
          url = body.url; detail = body.detail;
        } catch {
          // fall through to status-based error
        }
        if (xhr.status >= 200 && xhr.status < 300 && url) resolve(url);
        else reject(new Error(messageFromDetail(detail) ?? `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },
  searchUsers: async (query: string) => extractItems<Json>(await request<unknown>(`/users/search?q=${encodeURIComponent(query)}`)).map(mapUser),
  sendFriendRequest: (userId: string) => request<void>('/friends/requests', { method: 'POST', body: JSON.stringify({ user_id: userId, userId }) }),
  async friendRequests(currentUserId: string) {
    const rows = extractItems<Json>(await request<unknown>('/friends/requests')).filter((row) => row.status === 'pending');
    return Promise.all(rows.map(async (row): Promise<FriendRequest> => {
      const direction = String(row.requester_id) === currentUserId ? 'outgoing' : 'incoming';
      const userId = direction === 'outgoing' ? String(row.recipient_id) : String(row.requester_id);
      const person = mapUser(await request<Json>(`/users/${userId}/presence`));
      return { id: String(row.id), user: person, direction, createdAt: String(row.created_at) };
    }));
  },
  async friends(currentUserId: string): Promise<User[]> {
    return extractItems<Json>(await request<unknown>('/friends')).map(mapUser);
  },
  setFriendRemark: async (friendId: string, remark: string) => mapUser(await request<Json>(`/friends/${friendId}`, { method: 'PATCH', body: JSON.stringify({ remark: remark || null }) })),
  respondFriendRequest: (requestId: string, accept: boolean) => request<void>(`/friends/requests/${requestId}/${accept ? 'accept' : 'reject'}`, { method: 'POST' }),
  cancelFriendRequest: (requestId: string) => request<void>(`/friends/requests/${requestId}/cancel`, { method: 'POST' }),
  removeFriend: (userId: string) => request<void>(`/friends/${userId}`, { method: 'DELETE' }),
  blockUser: (userId: string) => request<void>(`/blocks/${userId}`, { method: 'POST' }),
  blocks: async () => extractItems<Json>(await request<unknown>('/blocks')).map(mapUser),
  unblockUser: (userId: string) => request<void>(`/blocks/${userId}`, { method: 'DELETE' }),
  createGroup: async (name: string, description: string, memberIds: string[]) => mapGroup(await request<Json>('/groups', { method: 'POST', body: JSON.stringify({ name, description, member_ids: memberIds }) })),
  myGroups: async () => extractItems<Json>(await request<unknown>('/groups')).map(mapGroup),
  searchGroups: async (query: string) => extractItems<Json>(await request<unknown>(`/groups/search?q=${encodeURIComponent(query)}`)).map(mapGroup),
  group: async (groupId: string) => mapGroup(await request<Json>(`/groups/${groupId}`)),
  updateGroup: async (groupId: string, patch: { name?: string; description?: string; avatarUrl?: string | null }) => mapGroup(await request<Json>(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify({ name: patch.name, description: patch.description, avatar_url: patch.avatarUrl }) })),
  addGroupMembers: async (groupId: string, userIds: string[]) => mapGroup(await request<Json>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ user_ids: userIds }) })),
  removeGroupMember: async (groupId: string, userId: string) => mapGroup(await request<Json>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' })),
  changeGroupMemberRole: async (groupId: string, userId: string, role: GroupRole) => mapGroup(await request<Json>(`/groups/${groupId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })),
  deleteGroup: (groupId: string) => request<void>(`/groups/${groupId}`, { method: 'DELETE' }),
  groupApplications: async (groupId: string) => extractItems<Json>(await request<unknown>(`/groups/${groupId}/applications`)).map((row) => ({ id: String(row.id), groupId: String(row.group_id), groupName: String(row.group_name), applicant: mapUser(row.applicant as Json), status: String(row.status), createdAt: String(row.created_at) }) as GroupApplication),
  applyToGroup: async (groupId: string) => request<Json>(`/groups/${groupId}/applications`, { method: 'POST', body: JSON.stringify({ group_id: groupId }) }),
  respondGroupApplication: async (groupId: string, applicationId: string, accept: boolean) => request<void>(`/groups/${groupId}/applications/${applicationId}/${accept ? 'accept' : 'reject'}`, { method: 'POST' }),
  conversations: async () => extractItems<Json>(await request<unknown>('/conversations')).map(mapConversation),
  async createConversation(participantIds: string[]) { return mapConversation(await request<Json>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: participantIds[0] }) })); },
  messages: async (conversationId: string, cursor?: string): Promise<Page<Message>> => {
    const query = cursor ? `?before=${encodeURIComponent(cursor)}` : '';
    const raw = await request<unknown>(`/conversations/${conversationId}/messages${query}`);
    const object = raw as Json;
    return { items: extractItems<Json>(raw).map((item) => mapMessage(item)), nextCursor: String(object.nextCursor ?? object.next_cursor ?? '') || null };
  },
  async sendMessage(conversationId: string, body: string, replyToId?: string, attachmentIds: string[] = []) { return mapMessage(await request<Json>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content: body, reply_to_id: replyToId, attachment_ids: attachmentIds }) })); },
  async editMessage(messageId: string, body: string) { return mapMessage(await request<Json>(`/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ content: body }) })); },
  deleteMessage: (messageId: string) => request<void>(`/messages/${messageId}`, { method: 'DELETE' }),
  async react(messageId: string, emoji: string) { return mapMessage(await request<Json>(`/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) })); },
  markRead: (conversationId: string, messageId: string) => request<void>(`/conversations/${conversationId}/read`, { method: 'POST', body: JSON.stringify({ message_id: messageId }) }),
  searchMessages: async (query: string, conversationId?: string) => extractItems<Json>(await request<unknown>(`/messages/search?q=${encodeURIComponent(query)}${conversationId ? `&conversation_id=${conversationId}` : ''}`)).map((item) => mapMessage(item)),
  upload: async (file: File): Promise<Attachment> => {
    const form = new FormData();
    form.append('file', file);
    return request<Attachment>('/media/upload', { method: 'POST', body: form });
  },
};
