const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000/api/v1';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API error');
  }
  return res.json();
}

export function apiFetchAuth<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...options?.headers } });
}
