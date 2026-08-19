import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000/api/v1';

export async function getAdminToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value || null;
}

export async function loginAdmin(email: string, password: string): Promise<{ access_token: string; user: any }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, device_name: 'Admin Panel' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail);
  }
  return res.json();
}

export async function getMe(token: string) {
  const res = await fetch(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
