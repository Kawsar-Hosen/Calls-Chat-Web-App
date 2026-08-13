import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'react-native';
import type { Attachment, AuthResult, Conversation, FriendRequest, Group, GroupApplication, GroupCustomization, GroupMember, GroupRole, GroupSettings, GroupSummary, Message, Tokens, User, UserSearchResult } from './types';

const DEFAULT_CUSTOMIZATION: GroupCustomization = { theme: 'default', font: 'default', wallpaper: 'plain', bubble: 'rounded', density: 'comfortable', radius: 8 };

function mapGroupCustomization(raw: Json | null | undefined): GroupCustomization {
  const value = raw ?? {};
  const str = (key: string, fallback: string) => (typeof value[key] === 'string' && String(value[key]) ? String(value[key]) : fallback);
  const num = (key: string, fallback: number) => (typeof value[key] === 'number' ? Number(value[key]) : fallback);
  return {
    theme: str('theme', DEFAULT_CUSTOMIZATION.theme),
    font: str('font', DEFAULT_CUSTOMIZATION.font),
    wallpaper: str('wallpaper', DEFAULT_CUSTOMIZATION.wallpaper),
    bubble: str('bubble', DEFAULT_CUSTOMIZATION.bubble),
    density: str('density', DEFAULT_CUSTOMIZATION.density),
    radius: num('radius', DEFAULT_CUSTOMIZATION.radius),
  };
}

type Json = Record<string, unknown>;
const TOKEN_KEY = 'xyteee.session';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1').replace(/\/$/, '');
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;
const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

function mapUser(raw: Json): User {
  const avatar = raw.avatar_url ? String(raw.avatar_url) : null;
  return {
    id: String(raw.id),
    username: String(raw.username ?? ''),
    displayName: String(raw.display_name ?? raw.username ?? 'Unknown'),
    ...(raw.email ? { email: String(raw.email) } : {}),
    bio: raw.bio ? String(raw.bio) : null,
    avatarUrl: avatar && avatar.startsWith('/') ? `${API_ORIGIN}${avatar}` : avatar,
    isOnline: raw.is_online === true,
    lastSeenAt: raw.last_seen_at ? String(raw.last_seen_at) : null,
    ...(raw.phone_code ? { phoneCode: String(raw.phone_code) } : {}),
    ...(raw.phone ? { phone: String(raw.phone) } : {}),
    ...(raw.remark != null ? { remark: String(raw.remark) } : {}),
  };
}

function mapGroupMember(raw: Json): GroupMember {
  return { user: mapUser((raw.user ?? {}) as Json), role: String(raw.role ?? 'member') as GroupRole, joinedAt: String(raw.joined_at ?? '') };
}

function mapGroupSettings(raw: Json | null | undefined): GroupSettings {
  const value = raw ?? {};
  const pick = (key: string, fallback: 'everyone' | 'admins'): 'everyone' | 'admins' => (value[key] === 'admins' ? 'admins' : value[key] === 'everyone' ? 'everyone' : fallback);
  return {
    canSend: pick('can_send', 'everyone'),
    canSendMedia: pick('can_send_media', 'everyone'),
    canAddMembers: pick('can_add_members', 'admins'),
    canEditInfo: pick('can_edit_info', 'admins'),
  };
}

export function mapGroup(raw: Json): Group {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description != null ? String(raw.description) : null,
    avatarUrl: raw.avatar_url != null ? String(raw.avatar_url) : null,
    conversationId: String(raw.conversation_id ?? ''),
    ownerId: String(raw.owner_id ?? ''),
    memberCount: Number(raw.member_count ?? 0),
    myRole: String(raw.my_role ?? 'member') as GroupRole,
    members: ((raw.members ?? []) as Json[]).map(mapGroupMember),
    updatedAt: String(raw.updated_at ?? ''),
    settings: mapGroupSettings(raw.settings as Json | null | undefined),
    customization: mapGroupCustomization(raw.customization as Json | null | undefined),
  };
}

function mapGroupSummary(raw: Json): GroupSummary {
  return {
    id: String(raw.id),
    name: String(raw.name),
    ...(raw.description != null ? { description: String(raw.description) } : {}),
    ...(raw.avatar_url != null ? { avatarUrl: String(raw.avatar_url) } : {}),
    ownerId: String(raw.owner_id ?? ''),
    myRole: String(raw.my_role ?? 'member') as GroupRole,
    memberCount: Number(raw.member_count ?? 0),
  };
}

function extractItems(raw: unknown): Json[] {
  if (Array.isArray(raw)) return raw as Json[];
  if (raw && typeof raw === 'object') {
    const items = (raw as Json).items;
    if (Array.isArray(items)) return items as Json[];
  }
  return [];
}

export function mapMessage(raw: Json): Message {
  return {
    id: String(raw.id),
    conversationId: String(raw.conversation_id),
    senderId: String(raw.sender_id),
    content: String(raw.content ?? ''),
    replyToId: raw.reply_to_id ? String(raw.reply_to_id) : null,
    reactions: ((raw.reactions ?? []) as Json[]).map((reaction) => ({ emoji: String(reaction.emoji), userId: String(reaction.user_id) })),
    createdAt: String(raw.created_at),
    editedAt: raw.edited_at ? String(raw.edited_at) : null,
    deletedAt: raw.deleted_at ? String(raw.deleted_at) : null,
    attachments: ((raw.attachments ?? []) as Json[]).map(mapAttachment),
    readByCount: Number(raw.read_by_count ?? 0),
  };
}

function mapAttachment(raw: Json): Attachment {
  const url = String(raw.url ?? '');
  return { id: String(raw.id), name: String(raw.name ?? 'Attachment'), url: url.startsWith('/') ? `${API_ORIGIN}${url}` : url, mimeType: String(raw.mime_type ?? 'application/octet-stream'), size: Number(raw.size ?? 0) };
}

function mapTokens(raw: Json): Tokens {
  return { accessToken: String(raw.access_token), refreshToken: String(raw.refresh_token) };
}

export async function getTokens(): Promise<Tokens | null> {
  const value = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as Tokens;
  } catch {
    await clearTokens();
    return null;
  }
}

async function saveTokens(tokens: Tokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function parseError(response: Response) {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return String(data.detail[0]?.msg ?? 'Please check the form');
  } catch {
    // Return a status-based fallback for non-JSON responses.
  }
  return `Request failed (${response.status})`;
}

let refreshPromise: Promise<Tokens> | null = null;
class RefreshableError extends Error {}
async function refresh(): Promise<Tokens> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await getTokens();
    if (!current) throw new Error('Your session has expired');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });
    if (!response.ok) {
      await clearTokens();
      throw new Error(await parseError(response));
    }
    const tokens = mapTokens((await response.json()) as Json);
    await saveTokens(tokens);
    return tokens;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const tokens = await getTokens();
  if (tokens) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && canRetry && tokens?.refreshToken) {
    await refresh();
    return request<T>(path, init, false);
  }
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const MAX_AVATAR_SIZE = 1024;

export async function prepareAvatarImage(uri: string): Promise<string> {
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject),
  );
  const actions: Parameters<typeof ImageManipulator.manipulateAsync>[1] = [];
  if (width !== height) {
    const side = Math.min(width, height);
    actions.push({ crop: { originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side } });
  }
  if (Math.max(width, height) > MAX_AVATAR_SIZE) {
    actions.push({ resize: { width: MAX_AVATAR_SIZE, height: MAX_AVATAR_SIZE } });
  }
  if (actions.length === 0) return uri;
  const result = await ImageManipulator.manipulateAsync(uri, actions, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
  return result.uri;
}

export const api = {
  async login(email: string, password: string): Promise<AuthResult> {
    const raw = await request<Json>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'XYTEEE mobile' }),
    });
    const result = { ...mapTokens(raw), user: mapUser(raw.user as Json) };
    await saveTokens(result);
    return result;
  },
  async register(data: { displayName: string; username: string; email: string; password: string }): Promise<AuthResult> {
    const raw = await request<Json>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ display_name: data.displayName, username: data.username, email: data.email, password: data.password, device_name: 'XYTEEE mobile' }),
    });
    const result = { ...mapTokens(raw), user: mapUser(raw.user as Json) };
    await saveTokens(result);
    return result;
  },
  async me() {
    return mapUser(await request<Json>('/profile'));
  },
  async logout() {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      await clearTokens();
    }
  },
  async updateProfile(data: { displayName?: string; username?: string; bio?: string; avatarUrl?: string | null; email?: string; phoneCode?: string | null; phone?: string | null }) {
    const body: Record<string, unknown> = {};
    if (data.displayName !== undefined) body.display_name = data.displayName;
    if (data.username !== undefined) body.username = data.username;
    if (data.bio !== undefined) body.bio = data.bio || null;
    if (data.avatarUrl !== undefined) body.avatar_url = data.avatarUrl;
    if (data.email !== undefined) body.email = data.email;
    if (data.phoneCode !== undefined || data.phone !== undefined) { body.phone_code = data.phoneCode ?? null; body.phone = data.phone ?? null; }
    return mapUser(await request<Json>('/profile', { method: 'PATCH', body: JSON.stringify(body) }));
  },
  async uploadAvatar(uri: string, onProgress?: (pct: number) => void): Promise<User> {
    const form = new FormData();
    form.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
    const send = async (tokens: Tokens | null): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/profile/avatar`);
        if (tokens?.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          let url: unknown; let detail: unknown;
          try {
            const body = JSON.parse(xhr.responseText) as { url?: unknown; detail?: unknown };
            url = body.url; detail = body.detail;
          } catch {
            // fall through to status-based error
          }
          if (xhr.status >= 200 && xhr.status < 300 && typeof url === 'string') resolve();
          else if (xhr.status === 401) reject(new RefreshableError());
          else if (typeof detail === 'string') reject(new Error(detail));
          else if (Array.isArray(detail) && typeof (detail[0] as { msg?: unknown } | undefined)?.msg === 'string') reject(new Error(String((detail[0] as { msg: unknown }).msg)));
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });
    };
    let tokens = await getTokens();
    try {
      await send(tokens);
    } catch (reason) {
      if (!(reason instanceof RefreshableError) || !tokens?.refreshToken) throw reason;
      tokens = await refresh();
      await send(tokens);
    }
    return api.me();
  },
  async conversations(): Promise<Conversation[]> {
    const rows = await request<Json[]>('/conversations');
    return rows.map((row) => ({
      id: String(row.id),
      kind: row.kind === 'group' ? 'group' : 'direct',
      ...(row.title != null ? { title: String(row.title) } : {}),
      ...(row.group ? { group: mapGroupSummary(row.group as Json) } : {}),
      members: ((row.members ?? []) as Json[]).map(mapUser),
      unreadCount: Number(row.unread_count ?? 0),
      updatedAt: String(row.updated_at),
      ...(row.last_message ? { lastMessage: mapMessage(row.last_message as Json) } : {}),
    }));
  },
  async createConversation(userId: string): Promise<Conversation> {
    const row = await request<Json>('/conversations', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    return {
      id: String(row.id),
      kind: row.kind === 'group' ? 'group' : 'direct',
      ...(row.title != null ? { title: String(row.title) } : {}),
      ...(row.group ? { group: mapGroupSummary(row.group as Json) } : {}),
      members: ((row.members ?? []) as Json[]).map(mapUser),
      unreadCount: Number(row.unread_count ?? 0),
      updatedAt: String(row.updated_at),
      ...(row.last_message ? { lastMessage: mapMessage(row.last_message as Json) } : {}),
    };
  },
  async messages(conversationId: string): Promise<{ items: Message[]; nextCursor: string | null }> {
    const raw = await request<Json>(`/conversations/${conversationId}/messages`);
    return {
      items: ((raw.items ?? []) as Json[]).map(mapMessage),
      nextCursor: raw.next_cursor ? String(raw.next_cursor) : null,
    };
  },
  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    return extractItems(await request<unknown>(`/messages/search?q=${encodeURIComponent(query)}${conversationId ? `&conversation_id=${conversationId}` : ''}`)).map(mapMessage);
  },
  async uploadMedia(uri: string, name: string, type: string): Promise<Attachment> {
    const form = new FormData();
    form.append('file', { uri, name, type } as unknown as Blob);
    return mapAttachment(await request<Json>('/media/upload', { method: 'POST', body: form }));
  },
  async saveGiphy(item: { id: string; kind: 'gif' | 'sticker'; title: string; url: string }): Promise<Attachment> {
    return mapAttachment(await request<Json>('/media/giphy', { method: 'POST', body: JSON.stringify(item) }));
  },
  async sendMessage(conversationId: string, content: string, attachmentIds: string[] = [], replyToId: string | null = null) {
    return mapMessage(await request<Json>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachment_ids: attachmentIds, reply_to_id: replyToId }),
    }));
  },
  async toggleReaction(messageId: string, emoji: string) {
    return mapMessage(await request<Json>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }));
  },
  async editMessage(messageId: string, content: string) {
    return mapMessage(await request<Json>(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }));
  },
  async deleteMessage(messageId: string) {
    return mapMessage(await request<Json>(`/messages/${messageId}`, { method: 'DELETE' }));
  },
  markRead: (conversationId: string, messageId: string) => request<void>(`/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  }),
  registerDevice: (pushToken: string, platform: 'ios' | 'android') => request<void>('/devices', {
    method: 'POST',
    body: JSON.stringify({ push_token: pushToken, platform }),
  }),
  async searchUsers(query: string, field: 'username' | 'email' | 'number' = 'username'): Promise<UserSearchResult[]> {
    return extractItems(await request<unknown>(`/users/search?q=${encodeURIComponent(query)}&field=${field}`)).map((raw) => {
      const user = mapUser(raw);
      return {
        ...user,
        isFriend: raw.is_friend === true,
        requestStatus: raw.request_status ? String(raw.request_status) as 'outgoing' | 'incoming' : null,
        isBlocked: raw.is_blocked === true,
      };
    });
  },
  async getUser(userId: string): Promise<UserSearchResult> {
    const raw = await request<Json>(`/users/${userId}`);
    const user = mapUser(raw);
    return {
      ...user,
      isFriend: raw.is_friend === true,
      requestStatus: raw.request_status ? String(raw.request_status) as 'outgoing' | 'incoming' : null,
      isBlocked: raw.is_blocked === true,
    };
  },
  async startDirectChat(userId: string): Promise<string> {
    const conversation = await this.createConversation(userId);
    return conversation.id;
  },
  async sendFriendRequest(userId: string) {
    await request<void>('/friends/requests', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
  },
  async friendRequests(currentUserId: string): Promise<FriendRequest[]> {
    const rows = extractItems(await request<unknown>('/friends/requests')).filter((row) => row.status === 'pending');
    return Promise.all(rows.map(async (row): Promise<FriendRequest> => {
      const direction = String(row.requester_id) === currentUserId ? 'outgoing' : 'incoming';
      const userId = direction === 'outgoing' ? String(row.recipient_id) : String(row.requester_id);
      const user = mapUser(await request<Json>(`/users/${userId}/presence`));
      return { id: String(row.id), user, direction, createdAt: String(row.created_at ?? '') };
    }));
  },
  async presence(userId: string): Promise<User> {
    return mapUser(await request<Json>(`/users/${userId}/presence`));
  },
  async friends(): Promise<User[]> {
    return extractItems(await request<unknown>('/friends')).map(mapUser);
  },
  async setFriendRemark(friendId: string, remark: string): Promise<User> {
    return mapUser(await request<Json>(`/friends/${friendId}`, { method: 'PATCH', body: JSON.stringify({ remark: remark || null }) }));
  },
  async respondFriendRequest(requestId: string, accept: boolean) {
    await request<void>(`/friends/requests/${requestId}/${accept ? 'accept' : 'reject'}`, { method: 'POST' });
  },
  async cancelFriendRequest(requestId: string) {
    await request<void>(`/friends/requests/${requestId}/cancel`, { method: 'POST' });
  },
  async removeFriend(userId: string) {
    await request<void>(`/friends/${userId}`, { method: 'DELETE' });
  },
  async blockUser(userId: string) {
    await request<void>(`/blocks/${userId}`, { method: 'POST' });
  },
  async unblockUser(userId: string) {
    await request<void>(`/blocks/${userId}`, { method: 'DELETE' });
  },
  async blocks(): Promise<User[]> {
    return extractItems(await request<unknown>('/blocks')).map(mapUser);
  },
  async createGroup(name: string, description: string, memberIds: string[]): Promise<Group> {
    return mapGroup(await request<Json>('/groups', { method: 'POST', body: JSON.stringify({ name, description: description || null, member_ids: memberIds }) }));
  },
  async myGroups(): Promise<Group[]> {
    return extractItems(await request<unknown>('/groups')).map(mapGroup);
  },
  async searchGroups(query: string): Promise<Group[]> {
    return extractItems(await request<unknown>(`/groups/search?q=${encodeURIComponent(query)}`)).map(mapGroup);
  },
  async group(groupId: string): Promise<Group> {
    return mapGroup(await request<Json>(`/groups/${groupId}`));
  },
  async updateGroup(groupId: string, patch: { name?: string; description?: string | null; avatarUrl?: string | null; settings?: Partial<GroupSettings>; customization?: GroupCustomization | null }) {
    return mapGroup(await request<Json>(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description || null } : {}),
        ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
        ...(patch.settings ? {
          settings: {
            can_send: patch.settings.canSend,
            can_send_media: patch.settings.canSendMedia,
            can_add_members: patch.settings.canAddMembers,
            can_edit_info: patch.settings.canEditInfo,
          },
        } : {}),
        ...(patch.customization !== undefined ? { customization: patch.customization } : {}),
      }),
    }));
  },
  async addGroupMembers(groupId: string, userIds: string[]): Promise<Group> {
    return mapGroup(await request<Json>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ user_ids: userIds }) }));
  },
  async removeGroupMember(groupId: string, userId: string): Promise<Group> {
    return mapGroup(await request<Json>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }));
  },
  async changeGroupMemberRole(groupId: string, userId: string, role: GroupRole): Promise<Group> {
    return mapGroup(await request<Json>(`/groups/${groupId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }));
  },
  async deleteGroup(groupId: string) {
    await request<void>(`/groups/${groupId}`, { method: 'DELETE' });
  },
  async groupApplications(groupId: string): Promise<GroupApplication[]> {
    return extractItems(await request<unknown>(`/groups/${groupId}/applications`)).map((row) => ({
      id: String(row.id),
      groupId: String(row.group_id),
      groupName: String(row.group_name),
      applicant: mapUser((row.applicant ?? {}) as Json),
      status: String(row.status),
      createdAt: String(row.created_at ?? ''),
    }));
  },
  async applyToGroup(groupId: string) {
    await request<void>(`/groups/${groupId}/applications`, { method: 'POST', body: JSON.stringify({ group_id: groupId }) });
  },
  async respondGroupApplication(groupId: string, applicationId: string, accept: boolean) {
    await request<void>(`/groups/${groupId}/applications/${applicationId}/${accept ? 'accept' : 'reject'}`, { method: 'POST' });
  },
};
