'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (search = q, offset = page) => {
    setLoading(true);
    const t = localStorage.getItem('admin_token');
    const params = new URLSearchParams({ limit: '30', offset: String(offset) });
    if (search) params.set('q', search);
    fetch(`${API}/admin/users?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { setUsers(d.items || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search users..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand outline-none" />
        <button onClick={() => load()} className="bg-brand text-white px-4 py-2.5 rounded-xl font-bold">Search</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">{total} users found</p>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Joined</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> :
              users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="font-bold text-brand hover:underline">{u.displayName || u.username}</Link><br/><span className="text-gray-400 text-xs">@{u.username}</span></td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                  <td className="px-4 py-3">{u.isBanned ? <span className="text-xs font-bold text-red-600">Banned</span> : u.isVerified ? <span className="text-xs font-bold text-brand">Verified</span> : <span className="text-xs text-gray-400">Active</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4">
        <button disabled={page === 0} onClick={() => { setPage(p => Math.max(0, p - 30)); load(q, Math.max(0, page - 30)); }} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">Previous</button>
        <button disabled={users.length < 30} onClick={() => { setPage(p => p + 30); load(q, page + 30); }} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
