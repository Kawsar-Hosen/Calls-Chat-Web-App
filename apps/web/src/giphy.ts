import { accessToken } from './api';

export type GiphyKind = 'gif' | 'sticker';
export interface GiphyItem { id: string; kind: GiphyKind; title: string; url: string; previewUrl: string; width: number; height: number; }

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');
const cache = new Map<string, GiphyItem[]>();

export async function giphyItems(kind: GiphyKind, query: string): Promise<GiphyItem[]> {
  const key = `${kind}:${query.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const token = accessToken();
  const response = await fetch(`${API_URL}/giphy/${kind === 'gif' ? 'gifs' : 'stickers'}?q=${encodeURIComponent(query.trim())}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(response.status === 502 || response.status === 503 ? 'GIPHY is temporarily unavailable' : 'Could not load GIPHY');
  const data = await response.json() as { items?: Record<string, unknown>[] };
  const items = (data.items ?? []).map((item): GiphyItem => ({ id: String(item.id), kind: String(item.kind) as GiphyKind, title: String(item.title || 'GIPHY media'), url: String(item.url), previewUrl: String(item.preview_url), width: Number(item.width || 1), height: Number(item.height || 1) }));
  cache.set(key, items);
  return items;
}

const RECENT_KEY = 'xyteee.media-recents';
export type RecentItem = { type: 'emoji'; value: string } | ({ type: GiphyKind } & GiphyItem);
export function mediaRecents(): RecentItem[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentItem[]; } catch { return []; } }
export function rememberMedia(item: RecentItem) {
  const identity = item.type === 'emoji' ? item.value : item.id;
  const next = [item, ...mediaRecents().filter((current) => (current.type === 'emoji' ? current.value : current.id) !== identity)].slice(0, 18);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
