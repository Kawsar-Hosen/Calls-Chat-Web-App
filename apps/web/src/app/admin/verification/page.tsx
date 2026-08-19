'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const CATEGORY_COLORS: Record<string, string> = {
  business: 'bg-blue-100 text-blue-700',
  personal: 'bg-green-100 text-green-700',
  government: 'bg-yellow-100 text-yellow-700',
  media: 'bg-orange-100 text-orange-700',
  sports: 'bg-pink-100 text-pink-700',
  music: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function VerificationPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (s = filter) => {
    setLoading(true);
    const t = localStorage.getItem('admin_token');
    const params = new URLSearchParams({ limit: '30', offset: '0' });
    if (s) params.set('status', s);
    fetch(`${API}/admin/verification?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { setRequests(d.items || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => { setFilter(s); load(s); }} className={`px-3 py-2 rounded-lg text-sm font-bold min-h-[44px] ${filter === s ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'}`}>{s || 'All'}</button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-3">{total} requests</p>
      <div className="space-y-3">
        {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> : requests.map(r => (
          <Link key={r.id} href={`/admin/verification/detail?id=${r.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              {r.avatarUrl ? <img src={r.avatarUrl} alt="" className="w-10 h-10 rounded-full shrink-0" /> : <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">{(r.displayName || r.username || 'U')[0].toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold truncate">{r.displayName || r.username}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">@{r.username} · {r.reqDisplayName}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${CATEGORY_COLORS[r.category] || ''}`}>{r.category}</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{r.reason}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
          </Link>
        ))}
        {!loading && requests.length === 0 && <p className="text-center text-gray-400 py-8">No verification requests.</p>}
      </div>
    </div>
  );
}
