import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'react-native';
import type { Attachment, AuthResult, BookmarkResponse, CommentPage, Conversation, FollowListPage, FollowResponse, FriendRequest, Group, GroupApplication, GroupCustomization, GroupMember, GroupRole, GroupSettings, GroupSummary, LocationResult, Message, NotificationPrefs, Post, PostComment, PostPage, ProfileMediaPage, ReactResponse, SearchResult, ShareResponse, SocialLink, StoryGroup, StoryHighlight, StoryHighlightPage, StoryReactionResponse, StoryReplyItem, StoryViewerUser, Tokens, User, UserProfile, UserSearchResult, AppNotification } from './types';

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
  const cover = raw.cover_url ? String(raw.cover_url) : null;
  return {
    id: String(raw.id),
    username: String(raw.username ?? ''),
    displayName: String(raw.display_name ?? raw.username ?? 'Unknown'),
    ...(raw.email ? { email: String(raw.email) } : {}),
    bio: raw.bio ? String(raw.bio) : null,
    avatarUrl: avatar && avatar.startsWith('/') ? `${API_ORIGIN}${avatar}` : avatar,
    coverUrl: cover && cover.startsWith('/') ? `${API_ORIGIN}${cover}` : cover,
    customStatus: raw.custom_status ? String(raw.custom_status) : null,
    accentColor: raw.accent_color ? String(raw.accent_color) : null,
    location: raw.location ? String(raw.location) : null,
    website: raw.website ? String(raw.website) : null,
    dateOfBirth: raw.date_of_birth ? String(raw.date_of_birth) : null,
    isVerified: raw.is_verified === true,
    verifiedCategory: raw.verified_category ? String(raw.verified_category) : undefined,
    role: raw.role ? String(raw.role) : 'user',
    isBanned: raw.is_banned === true,
    isOnline: raw.is_online === true,
    lastSeenAt: raw.last_seen_at ? String(raw.last_seen_at) : null,
    lastSeenVisible: raw.last_seen_visible !== false,
    onlineVisible: raw.online_visible !== false,
    whoCanMessage: raw.who_can_message ? String(raw.who_can_message) : 'everyone',
    whoCanSeePosts: raw.who_can_see_posts ? String(raw.who_can_see_posts) : 'public',
    readReceipts: raw.read_receipts !== false,
    typingIndicator: raw.typing_indicator !== false,
    fontSize: raw.font_size ? String(raw.font_size) : 'default',
    fontStyle: raw.font_style ? String(raw.font_style) : 'system',
    ...(raw.phone_code ? { phoneCode: String(raw.phone_code) } : {}),
    ...(raw.phone ? { phone: String(raw.phone) } : {}),
    ...(raw.facebook_id ? { facebookId: String(raw.facebook_id) } : {}),
    ...(raw.remark != null ? { remark: String(raw.remark) } : {}),
    ...(raw.created_at ? { createdAt: String(raw.created_at) } : {}),
  };
}

function mapUserSearch(raw: Json): UserSearchResult {
  const user = mapUser(raw);
  return {
    ...user,
    isFriend: raw.is_friend === true,
    requestStatus: raw.request_status ? String(raw.request_status) as 'outgoing' | 'incoming' : null,
    requestId: raw.request_id ? String(raw.request_id) : null,
    isBlocked: raw.is_blocked === true,
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
    reactions: ((raw.reactions ?? []) as Json[]).map((reaction) => ({ emoji: String(reaction.emoji), userId: String(reaction.user_id), displayName: String(reaction.display_name ?? ''), avatarUrl: reaction.avatar_url != null ? String(reaction.avatar_url) : null })),
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

function mapPost(raw: Json): Post {
  return {
    id: String(raw.id),
    author: mapUser((raw.author ?? {}) as Json),
    content: raw.content ? String(raw.content) : null,
    visibility: raw.visibility === 'friends' ? 'friends' : 'public',
    media: ((raw.media ?? []) as Json[]).map((m) => ({ id: String(m.id), url: String(m.url), mimeType: String(m.mime_type), sortOrder: Number(m.sort_order ?? 0) })),
    reactions: ((raw.reactions ?? []) as Json[]).map((r) => ({ emoji: String(r.emoji), userId: String(r.user_id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url != null ? String(r.avatar_url) : null })),
    likeCount: Number(raw.like_count ?? 0),
    commentCount: Number(raw.comment_count ?? 0),
    shareCount: Number(raw.share_count ?? 0),
    myLikeEmoji: raw.my_like_emoji ? String(raw.my_like_emoji) : null,
    myBookmarked: raw.my_bookmarked === true,
    myShared: raw.my_shared === true,
    createdAt: String(raw.created_at),
    updatedAt: raw.updated_at ? String(raw.updated_at) : null,
  };
}

function mapComment(raw: Json): PostComment {
  return {
    id: String(raw.id),
    postId: String(raw.post_id),
    author: mapUser((raw.author ?? {}) as Json),
    content: String(raw.content ?? ''),
    parentId: raw.parent_id ? String(raw.parent_id) : null,
    reactions: ((raw.reactions ?? []) as Json[]).map((r) => ({ emoji: String(r.emoji), userId: String(r.user_id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url != null ? String(r.avatar_url) : null })),
    reactionCount: Number(raw.reaction_count ?? 0),
    replyCount: Number(raw.reply_count ?? 0),
    createdAt: String(raw.created_at),
  };
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
  async register(data: { displayName: string; username: string; email: string; password: string; dateOfBirth?: string; gender?: string }): Promise<AuthResult> {
    const raw = await request<Json>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ display_name: data.displayName, username: data.username, email: data.email, password: data.password, date_of_birth: data.dateOfBirth, gender: data.gender, device_name: 'XYTEEE mobile' }),
    });
    const result = { ...mapTokens(raw), user: mapUser(raw.user as Json) };
    await saveTokens(result);
    return result;
  },
  async googleSignIn(idToken: string): Promise<AuthResult> {
    const raw = await request<Json>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, device_name: 'XYTEEE mobile' }),
    });
    const result = { ...mapTokens(raw), user: mapUser(raw.user as Json) };
    await saveTokens(result);
    return result;
  },
  async facebookSignIn(accessToken: string): Promise<AuthResult> {
    const raw = await request<Json>('/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, device_name: 'XYTEEE mobile' }),
    });
    const result = { ...mapTokens(raw), user: mapUser(raw.user as Json) };
    await saveTokens(result);
    return result;
  },
  async telegramStart(phone: string): Promise<{ success: boolean; message: string }> {
    return request('/auth/telegram/start', { method: 'POST', body: JSON.stringify({ phone }) });
  },
  async telegramVerify(phone: string, code: string): Promise<AuthResult> {
    const raw = await request<Json>('/auth/telegram/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
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
  async requestAccountDeletion(password: string): Promise<{ message: string; email_masked: string }> {
    return request<{ message: string; email_masked: string }>('/account/delete/request', { method: 'POST', body: JSON.stringify({ password }) });
  },
  async deleteAccount(password: string, code: string): Promise<void> {
    await request<void>('/account', { method: 'DELETE', body: JSON.stringify({ password, code }) });
  },
  async updateProfile(data: { displayName?: string; username?: string; bio?: string; avatarUrl?: string | null; customStatus?: string | null; accentColor?: string | null; location?: string | null; website?: string | null; email?: string; phoneCode?: string | null; phone?: string | null; lastSeenVisible?: boolean; onlineVisible?: boolean; whoCanMessage?: string; whoCanSeePosts?: string; readReceipts?: boolean; typingIndicator?: boolean; fontSize?: string; fontStyle?: string; chatWallpaper?: string | null }) {
    const body: Record<string, unknown> = {};
    if (data.displayName !== undefined) body.display_name = data.displayName;
    if (data.username !== undefined) body.username = data.username;
    if (data.bio !== undefined) body.bio = data.bio || null;
    if (data.avatarUrl !== undefined) body.avatar_url = data.avatarUrl;
    if (data.customStatus !== undefined) body.custom_status = data.customStatus || null;
    if (data.accentColor !== undefined) body.accent_color = data.accentColor || null;
    if (data.location !== undefined) body.location = data.location || null;
    if (data.website !== undefined) body.website = data.website || null;
    if (data.email !== undefined) body.email = data.email;
    if (data.phoneCode !== undefined || data.phone !== undefined) { body.phone_code = data.phoneCode ?? null; body.phone = data.phone ?? null; }
    if (data.lastSeenVisible !== undefined) body.last_seen_visible = data.lastSeenVisible;
    if (data.onlineVisible !== undefined) body.online_visible = data.onlineVisible;
    if (data.whoCanMessage !== undefined) body.who_can_message = data.whoCanMessage;
    if (data.whoCanSeePosts !== undefined) body.who_can_see_posts = data.whoCanSeePosts;
    if (data.readReceipts !== undefined) body.read_receipts = data.readReceipts;
    if (data.typingIndicator !== undefined) body.typing_indicator = data.typingIndicator;
    if (data.fontSize !== undefined) body.font_size = data.fontSize;
    if (data.fontStyle !== undefined) body.font_style = data.fontStyle;
    if (data.chatWallpaper !== undefined) body.chat_wallpaper = data.chatWallpaper || null;
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
  async uploadCover(uri: string, onProgress?: (pct: number) => void): Promise<User> {
    const form = new FormData();
    form.append('file', { uri, name: 'cover.jpg', type: 'image/jpeg' } as unknown as Blob);
    const send = async (tokens: Tokens | null): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/profile/cover`);
        if (tokens?.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          let url: unknown; let detail: unknown;
          try {
            const body = JSON.parse(xhr.responseText) as { url?: unknown; detail?: unknown };
            url = body.url; detail = body.detail;
          } catch {}
          if (xhr.status >= 200 && xhr.status < 300 && typeof url === 'string') resolve();
          else if (xhr.status === 401) reject(new RefreshableError());
          else if (typeof detail === 'string') reject(new Error(detail));
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });
    };
    let tokens = await getTokens();
    try { await send(tokens); } catch (reason) {
      if (!(reason instanceof RefreshableError) || !tokens?.refreshToken) throw reason;
      tokens = await refresh(); await send(tokens);
    }
    return api.me();
  },
  async getSocialLinks(userId: string): Promise<SocialLink[]> {
    const raw = await request<Json>(`/users/${userId}/social-links`);
    return extractItems(raw).map((r) => ({ id: String(r.id), platform: String(r.platform), username: String(r.username), url: String(r.url), sortOrder: Number(r.sort_order ?? 0) }));
  },
  async saveSocialLink(data: { platform: string; username: string; url: string; sortOrder?: number }): Promise<SocialLink> {
    const r = await request<Json>('/profile/social-links', { method: 'POST', body: JSON.stringify({ platform: data.platform, username: data.username, url: data.url, sort_order: data.sortOrder ?? 0 }) });
    return { id: String(r.id), platform: String(r.platform), username: String(r.username), url: String(r.url), sortOrder: Number(r.sort_order ?? 0) };
  },
  async deleteSocialLink(linkId: string): Promise<void> {
    await request<Json>(`/profile/social-links/${linkId}`, { method: 'DELETE' });
  },
  async searchLocations(query: string): Promise<LocationResult[]> {
    if (query.length < 2) return [];
    return request<LocationResult[]>(`/locations/search?q=${encodeURIComponent(query)}`);
  },
  async deleteAvatar(): Promise<User> {
    await request<Json>('/profile/avatar', { method: 'DELETE' });
    return api.me();
  },
  async deleteCover(): Promise<User> {
    await request<Json>('/profile/cover', { method: 'DELETE' });
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
  async messages(conversationId: string, before?: string | null, limit = 100): Promise<{ items: Message[]; nextCursor: string | null }> {
    const query = `limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
    const raw = await request<Json>(`/conversations/${conversationId}/messages?${query}`);
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
    const send = async (tokens: Tokens | null): Promise<Json> => {
      return await new Promise<Json>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/media/upload`);
        if (tokens?.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Bad response')); } }
          else if (xhr.status === 401) reject(new RefreshableError());
          else { try { const d = JSON.parse(xhr.responseText); reject(new Error(d.detail || `Upload failed (${xhr.status})`)); } catch { reject(new Error(`Upload failed (${xhr.status})`)); } }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });
    };
    let tokens = await getTokens();
    try { return mapAttachment(await send(tokens)); }
    catch (reason) {
      if (!(reason instanceof RefreshableError) || !tokens?.refreshToken) throw reason;
      tokens = await refresh();
      return mapAttachment(await send(tokens));
    }
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
  turnCredentials: () => request<{ iceServers: { urls: string[]; username: string; credential: string }[] }>('/calls/turn', {
    method: 'POST',
  }),
  pendingCall: () => request<{ conversation_id: string; caller_id: string; sdp: string; kind?: string } | null>('/calls/pending', {
    method: 'GET',
  }),
  async searchUsers(query: string, field: 'username' | 'email' | 'number' = 'username'): Promise<UserSearchResult[]> {
    return extractItems(await request<unknown>(`/users/search?q=${encodeURIComponent(query)}&field=${field}`)).map((raw) => {
      const user = mapUser(raw);
      return {
        ...user,
        isFriend: raw.is_friend === true,
        requestStatus: raw.request_status ? String(raw.request_status) as 'outgoing' | 'incoming' : null,
        requestId: raw.request_id ? String(raw.request_id) : null,
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
      requestId: raw.request_id ? String(raw.request_id) : null,
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
  async forgotPassword(email: string) {
    await request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },
  async verifyResetCode(email: string, code: string) {
    await request<void>('/auth/verify-reset-code', { method: 'POST', body: JSON.stringify({ email, code }) });
  },
  async resetPassword(email: string, code: string, password: string) {
    await request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) });
  },

  // ── Feed / Posts ──────────────────────────────────────────

  async feed(section: 'friends' | 'public' = 'friends', cursor?: string, limit = 20): Promise<PostPage> {
    const params = new URLSearchParams({ section, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const raw = await request<Json>(`/feed?${params}`);
    return { items: (extractItems(raw) as Json[]).map(mapPost), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async createPost(data: { content?: string; mediaIds?: string[]; visibility?: 'friends' | 'public' }): Promise<Post> {
    const raw = await request<Json>('/posts', { method: 'POST', body: JSON.stringify({ content: data.content || null, media_ids: data.mediaIds || [], visibility: data.visibility || 'public' }) });
    return mapPost(raw);
  },

  async getPost(postId: string): Promise<Post> {
    return mapPost(await request<Json>(`/posts/${postId}`));
  },

  async editPost(postId: string, content: string): Promise<Post> {
    return mapPost(await request<Json>(`/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ content }) }));
  },

  async deletePost(postId: string): Promise<void> {
    await request<void>(`/posts/${postId}`, { method: 'DELETE' });
  },

  async userPosts(userId: string, cursor?: string, limit = 20): Promise<PostPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const raw = await request<Json>(`/users/${userId}/posts?${params}`);
    return { items: (extractItems(raw) as Json[]).map(mapPost), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async reactPost(postId: string, emoji: string): Promise<ReactResponse> {
    const raw = await request<Json>(`/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
    return { likeCount: Number(raw.like_count ?? 0), myLikeEmoji: raw.my_like_emoji ? String(raw.my_like_emoji) : null, reactions: ((raw.reactions ?? []) as Json[]).map((r) => ({ emoji: String(r.emoji), userId: String(r.user_id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url != null ? String(r.avatar_url) : null })) };
  },

  async postComments(postId: string, cursor?: string, limit = 20): Promise<CommentPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const raw = await request<Json>(`/posts/${postId}/comments?${params}`);
    return { items: (extractItems(raw) as Json[]).map(mapComment), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async addComment(postId: string, content: string, parentId?: string): Promise<PostComment> {
    const raw = await request<Json>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content, parent_id: parentId || null }) });
    return mapComment(raw);
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await request<void>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  },

  async reactComment(postId: string, commentId: string, emoji: string): Promise<{ reactionCount: number; myReaction: string | null }> {
    const raw = await request<Json>(`/posts/${postId}/comments/${commentId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
    return { reactionCount: Number(raw.reaction_count ?? 0), myReaction: raw.my_reaction ? String(raw.my_reaction) : null };
  },

  async sharePost(postId: string): Promise<ShareResponse> {
    const raw = await request<Json>(`/posts/${postId}/share`, { method: 'POST' });
    return { shareCount: Number(raw.share_count ?? 0), myShared: raw.my_shared === true };
  },

  async bookmarkPost(postId: string): Promise<BookmarkResponse> {
    const raw = await request<Json>(`/posts/${postId}/bookmark`, { method: 'POST' });
    return { myBookmarked: raw.my_bookmarked === true };
  },

  async bookmarks(cursor?: string, limit = 20): Promise<PostPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const raw = await request<Json>(`/bookmarks?${params}`);
    return { items: (extractItems(raw) as Json[]).map(mapPost), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async feedStories(): Promise<StoryGroup[]> {
    const raw = await request<unknown>('/feed/stories');
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((g: Json) => ({
      author: mapUser((g.author ?? {}) as Json),
      stories: ((g.stories ?? []) as Json[]).map((s) => ({
        id: String(s.id), mediaUrl: String(s.media_url), mediaType: s.media_type === 'video' ? 'video' as const : 'image' as const,
        content: s.content ? String(s.content) : null, createdAt: String(s.created_at), expiresAt: String(s.expires_at),
        viewCount: Number(s.view_count ?? 0), myViewed: s.my_viewed === true,
      })),
      hasUnviewed: g.has_unviewed === true,
    }));
  },

  async createStory(mediaId: string, content?: string) {
    const raw = await request<Json>('/stories', { method: 'POST', body: JSON.stringify({ media_id: mediaId, content: content || null }) });
    return { id: String(raw.id), mediaUrl: String(raw.media_url), mediaType: raw.media_type === 'video' ? 'video' as const : 'image' as const, content: raw.content ? String(raw.content) : null, createdAt: String(raw.created_at), expiresAt: String(raw.expires_at), viewCount: Number(raw.view_count ?? 0), myViewed: false };
  },

  async deleteStory(storyId: string): Promise<void> {
    await request<void>(`/stories/${storyId}`, { method: 'DELETE' });
  },

  async viewStory(storyId: string): Promise<{ viewCount: number }> {
    const raw = await request<Json>(`/stories/${storyId}/view`, { method: 'POST' });
    return { viewCount: Number(raw.view_count ?? 0) };
  },

  async toggleFollow(userId: string): Promise<FollowResponse> {
    const raw = await request<Json>(`/users/${userId}/follow`, { method: 'POST' });
    return { following: raw.following === true, followerCount: Number(raw.follower_count ?? 0), followingCount: Number(raw.following_count ?? 0) };
  },

  async getUserProfile(userId: string): Promise<UserProfile> {
    const raw = await request<Json>(`/users/${userId}/profile`);
    return {
      user: mapUser((raw.user ?? {}) as Json),
      followerCount: Number(raw.follower_count ?? 0),
      followingCount: Number(raw.following_count ?? 0),
      postCount: Number(raw.post_count ?? 0),
      isFollowing: raw.is_following === true,
      isSelf: raw.is_self === true,
      mutualFriendCount: Number(raw.mutual_friend_count ?? 0),
      profileViewCount: Number(raw.profile_view_count ?? 0),
    };
  },

  async getPublicPosts(userId: string, cursor?: string, limit = 20): Promise<PostPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const raw = await request<Json>(`/users/${userId}/posts?${params}`);
    return { items: (extractItems(raw) as Json[]).map(mapPost), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async getUserMedia(userId: string, cursor?: string): Promise<ProfileMediaPage> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await request<Json>(`/users/${userId}/media${qs}`);
    return {
      items: ((raw.items ?? []) as Json[]).map((i) => ({ id: String(i.id), url: String(i.url), mimeType: i.mime_type ? String(i.mime_type) : null, postId: String(i.post_id), createdAt: String(i.created_at) })),
      nextCursor: raw.next_cursor ? String(raw.next_cursor) : null,
    };
  },

  async getUserLikes(userId: string, cursor?: string): Promise<PostPage> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await request<Json>(`/users/${userId}/likes${qs}`);
    return { items: (extractItems(raw) as Json[]).map(mapPost), nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async getUserHighlights(userId: string): Promise<StoryHighlightPage> {
    const raw = await request<Json>(`/users/${userId}/highlights`);
    return {
      items: ((raw.items ?? []) as Json[]).map((i) => ({ id: String(i.id), title: String(i.title), coverUrl: i.cover_url ? String(i.cover_url) : null, sortOrder: Number(i.sort_order ?? 0), storyCount: Number(i.story_count ?? 0), createdAt: String(i.created_at) })),
      nextCursor: raw.next_cursor ? String(raw.next_cursor) : null,
    };
  },

  async createHighlight(userId: string, title: string, coverUrl?: string): Promise<StoryHighlight> {
    const raw = await request<Json>(`/users/${userId}/highlights`, { method: 'POST', body: JSON.stringify({ title, cover_url: coverUrl || null }) });
    return { id: String(raw.id), title: String(raw.title), coverUrl: raw.cover_url ? String(raw.cover_url) : null, sortOrder: Number(raw.sort_order ?? 0), storyCount: Number(raw.story_count ?? 0), createdAt: String(raw.created_at) };
  },

  async deleteHighlight(userId: string, highlightId: string): Promise<void> {
    await request<void>(`/users/${userId}/highlights/${highlightId}`, { method: 'DELETE' });
  },

  async getFollowers(userId: string, cursor?: string): Promise<FollowListPage> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await request<Json>(`/users/${userId}/followers${qs}`);
    const items = ((raw.items ?? []) as Json[]).map((r) => ({ ...mapUser(r), followedAt: String(r.followed_at ?? '') }));
    return { items, nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async getFollowing(userId: string, cursor?: string): Promise<FollowListPage> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await request<Json>(`/users/${userId}/following${qs}`);
    const items = ((raw.items ?? []) as Json[]).map((r) => ({ ...mapUser(r), followedAt: String(r.followed_at ?? '') }));
    return { items, nextCursor: raw.next_cursor ? String(raw.next_cursor) : null };
  },

  async reactStory(storyId: string, emoji: string): Promise<StoryReactionResponse> {
    const raw = await request<Json>(`/stories/${storyId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
    return {
      emoji: String(raw.emoji ?? emoji),
      reactionCount: Number(raw.reaction_count ?? 0),
      myReaction: raw.my_reaction ? String(raw.my_reaction) : null,
      reactions: ((raw.reactions ?? []) as Json[]).map((r) => ({ emoji: String(r.emoji), userId: String(r.user_id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url ? String(r.avatar_url) : null })),
    };
  },

  async getStoryReactions(storyId: string): Promise<StoryReactionResponse> {
    const raw = await request<Json>(`/stories/${storyId}/reactions`);
    return {
      emoji: String(raw.emoji ?? ''),
      reactionCount: Number(raw.reaction_count ?? 0),
      myReaction: raw.my_reaction ? String(raw.my_reaction) : null,
      reactions: ((raw.reactions ?? []) as Json[]).map((r) => ({ emoji: String(r.emoji), userId: String(r.user_id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url ? String(r.avatar_url) : null })),
    };
  },

  async replyStory(storyId: string, content: string): Promise<StoryReplyItem> {
    const raw = await request<Json>(`/stories/${storyId}/reply`, { method: 'POST', body: JSON.stringify({ content }) });
    return { id: String(raw.id), sender: mapUser((raw.sender ?? {}) as Json), content: raw.content ? String(raw.content) : null, createdAt: String(raw.created_at) };
  },

  async getStoryViewers(storyId: string): Promise<StoryViewerUser[]> {
    const raw = await request<Json[]>(`/stories/${storyId}/viewers`);
    return (Array.isArray(raw) ? raw : []).map((r: any) => ({ id: String(r.id), displayName: String(r.display_name ?? ''), avatarUrl: r.avatar_url ? String(r.avatar_url) : null, viewedAt: String(r.viewed_at) }));
  },

  async getNotificationPrefs(): Promise<NotificationPrefs> {
    const raw = await request<Json>('/settings/notifications');
    return { messages: !!raw.messages, calls: !!raw.calls, posts: !!raw.posts, comments: !!raw.comments, reactions: !!raw.reactions, follows: !!raw.follows, mentions: !!raw.mentions, groupActivity: !!raw.group_activity };
  },

  async updateNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    const body: Record<string, unknown> = {};
    if (patch.messages !== undefined) body.messages = patch.messages;
    if (patch.calls !== undefined) body.calls = patch.calls;
    if (patch.posts !== undefined) body.posts = patch.posts;
    if (patch.comments !== undefined) body.comments = patch.comments;
    if (patch.reactions !== undefined) body.reactions = patch.reactions;
    if (patch.follows !== undefined) body.follows = patch.follows;
    if (patch.mentions !== undefined) body.mentions = patch.mentions;
    if (patch.groupActivity !== undefined) body.group_activity = patch.groupActivity;
    const raw = await request<Json>('/settings/notifications', { method: 'PATCH', body: JSON.stringify(body) });
    return { messages: !!raw.messages, calls: !!raw.calls, posts: !!raw.posts, comments: !!raw.comments, reactions: !!raw.reactions, follows: !!raw.follows, mentions: !!raw.mentions, groupActivity: !!raw.group_activity };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<Json>('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
  },

  async changeEmail(password: string, newEmail: string): Promise<void> {
    await request<Json>('/auth/change-email', { method: 'POST', body: JSON.stringify({ password, new_email: newEmail }) });
  },

  async submitReport(type: string, targetId: string | null, reason: string, details?: string): Promise<void> {
    await request<Json>('/reports', { method: 'POST', body: JSON.stringify({ type, target_id: targetId, reason, details }) });
  },

  async getDataUsage(): Promise<{ posts: number; stories: number; messages: number; media: number; mediaBytes: number }> {
    const raw = await request<Json>('/settings/data/usage');
    return { posts: Number(raw.posts ?? 0), stories: Number(raw.stories ?? 0), messages: Number(raw.messages ?? 0), media: Number(raw.media ?? 0), mediaBytes: Number(raw.media_bytes ?? 0) };
  },

  async deleteAllPosts(): Promise<void> {
    await request<void>('/settings/data/posts', { method: 'DELETE' });
  },

  async deleteAllStories(): Promise<void> {
    await request<void>('/settings/data/stories', { method: 'DELETE' });
  },

  async deleteAllMessages(): Promise<void> {
    await request<void>('/settings/data/messages', { method: 'DELETE' });
  },

  async deleteAllMedia(): Promise<void> {
    await request<void>('/settings/data/media', { method: 'DELETE' });
  },

  async getNotifications(cursor?: string): Promise<{ items: AppNotification[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    const raw = await request<Json[]>(`/notifications${qs ? `?${qs}` : ''}`);
    return {
      items: raw.map((r: any) => ({ id: r.id, fromUserId: r.from_user_id, fromUserName: r.from_user_name, fromUserAvatar: r.from_user_avatar, type: r.type, targetType: r.target_type, targetId: r.target_id, body: r.body, isRead: r.is_read, createdAt: r.created_at })),
      nextCursor: raw.length >= 30 ? String((raw[raw.length - 1] as any).id ?? null) : null,
    };
  },

  async getNotificationCount(): Promise<number> {
    const raw = await request<Json>('/notifications/count');
    return Number(raw.count ?? 0);
  },

  async markNotificationsRead(ids?: string[]): Promise<void> {
    await request<void>('/notifications/read', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) });
  },

  async clearNotifications(): Promise<void> {
    await request<void>('/notifications', { method: 'DELETE' });
  },

  async searchAll(query: string): Promise<SearchResult> {
    const raw = await request<Json>(`/search?q=${encodeURIComponent(query)}`);
    return {
      users: ((raw as any).users ?? []).map((u: any) => mapUserSearch(u)),
      posts: ((raw as any).posts ?? []).map((p: any) => ({ id: p.id, body: p.body, authorId: p.author_id, createdAt: p.created_at })),
    };
  },
};

export async function submitVerificationRequest(category: string, displayName: string, reason: string, documentUrls: string[] = []) {
  const res = await request<Json>('/verification/request', {
    method: 'POST',
    body: JSON.stringify({ category, display_name: displayName, reason, document_urls: documentUrls }),
  });
  return res;
}

export async function getMyVerificationRequest() {
  const res = await request<Json>('/verification/my-request');
  return res;
}
