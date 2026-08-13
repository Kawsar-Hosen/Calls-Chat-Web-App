import * as SecureStore from 'expo-secure-store';
import { API_URL, getTokens } from './api';

export type GiphyKind = 'gif' | 'sticker';
export interface GiphyItem { id: string; kind: GiphyKind; title: string; url: string; previewUrl: string; width: number; height: number; }
export type RecentItem = { type: 'emoji'; value: string } | ({ type: GiphyKind } & GiphyItem);
const RECENT_KEY = 'xyteee.media-recents';
const cache = new Map<string, GiphyItem[]>();

export async function giphyItems(kind: GiphyKind, query: string) {
  const key = `${kind}:${query.trim().toLowerCase()}`;
  const cached = cache.get(key); if (cached) return cached;
  const tokens = await getTokens();
  const response = await fetch(`${API_URL}/giphy/${kind === 'gif' ? 'gifs' : 'stickers'}?q=${encodeURIComponent(query.trim())}`, { headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {} });
  if (!response.ok) throw new Error(response.status === 502 || response.status === 503 ? 'GIPHY is temporarily unavailable' : 'Could not load GIPHY');
  const data = await response.json() as { items?: Record<string, unknown>[] };
  const items = (data.items ?? []).map((item): GiphyItem => ({ id: String(item.id), kind: String(item.kind) as GiphyKind, title: String(item.title || 'GIPHY media'), url: String(item.url), previewUrl: String(item.preview_url), width: Number(item.width || 1), height: Number(item.height || 1) }));
  cache.set(key, items); return items;
}
export async function mediaRecents(): Promise<RecentItem[]> { try { return JSON.parse(await SecureStore.getItemAsync(RECENT_KEY) ?? '[]') as RecentItem[]; } catch { return []; } }
export async function rememberMedia(item: RecentItem) { const identity = item.type === 'emoji' ? item.value : item.id; const next = [item, ...(await mediaRecents()).filter((current) => (current.type === 'emoji' ? current.value : current.id) !== identity)].slice(0, 18); await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next)); }
