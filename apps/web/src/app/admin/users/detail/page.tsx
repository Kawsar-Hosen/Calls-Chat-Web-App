'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function UserDetailPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('id');
    if (!q) { router.push('/admin/users'); return; }
    setId(q);
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/users/${q}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(setUser).catch(() => router.push('/admin/users')).finally(() => setLoading(false));
  }, []);

  const update = async (data: any) => {
    setSaving(true);
    const t = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(data) });
    if (res.ok) { const u = await res.json(); setUser(u); }
    setSaving(false);
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!user) return <p className="text-red-500">User not found</p>;

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-brand text-sm font-bold mb-4 min-h-[44px] flex items-center">&larr; Back</button>
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          {user.avatarUrl ? <img src={user.avatarUrl} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full shrink-0" alt="" /> : <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-lg shrink-0">{(user.displayName || user.username || 'U')[0].toUpperCase()}</div>}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold truncate">{user.displayName} {user.isVerified && <span className="text-brand">✓</span>}</h1>
            <p className="text-gray-500 text-sm truncate">@{user.username} · {user.email}</p>
            <p className="text-xs text-gray-400 mt-1">Role: {user.role} · Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700">Role</label>
            <select value={user.role} onChange={e => update({ role: e.target.value })} disabled={saving} className="w-full mt-1 px-3 py-3 rounded-lg border border-gray-300 min-h-[44px]">
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 min-h-[44px]">
              <input type="checkbox" checked={user.isVerified} onChange={e => update({ isVerified: e.target.checked })} disabled={saving} className="w-4 h-4" />
              <span className="text-sm font-bold">Verified</span>
            </label>
            <label className="flex items-center gap-2 min-h-[44px]">
              <input type="checkbox" checked={user.isBanned} onChange={e => update({ isBanned: e.target.checked })} disabled={saving} className="w-4 h-4" />
              <span className="text-sm font-bold text-red-600">Banned</span>
            </label>
          </div>
          {user.isBanned && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">This user is banned{user.banReason ? `: ${user.banReason}` : ''}</p>
            </div>
          )}
          <button onClick={() => { if (confirm('Delete this user permanently?')) { const t = localStorage.getItem('admin_token'); fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } }).then(() => router.push('/admin/users')); } }} className="bg-red-500 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-600 mt-4 min-h-[44px] w-full sm:w-auto">Delete User</button>
        </div>
      </div>
    </div>
  );
}
