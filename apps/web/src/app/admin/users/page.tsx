'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type Tab = { key: string; label: string };
const TABS: Tab[] = [
  { key: '', label: 'All' },
  { key: 'user', label: 'Users' },
  { key: 'moderator', label: 'Moderators' },
  { key: 'admin', label: 'Admins' },
  { key: 'banned', label: 'Banned' },
];

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border border-blue-200',
  moderator: 'bg-amber-100 text-amber-700 border border-amber-200',
  user: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function roleBadge(role: string) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
      {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 30;

  const load = useCallback(async (search = q, offset = page, role = activeTab) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('q', search);
      if (role === 'banned') params.set('isBanned', 'true');
      else if (role) params.set('role', role);
      const res = await fetch(`${API}/admin/users?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load users');
      const d = await res.json();
      setUsers(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, page, activeTab]);

  useEffect(() => { load(); }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(0);
    load(q, 0, tab);
  };

  const handleSearch = () => {
    setPage(0);
    load(q, 0, activeTab);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(page / limit) + 1;

  function UserRow({ u }: { u: any }) {
    return (
      <Link
        href={`/admin/users/detail?id=${u.id}`}
        className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-200"
      >
        <div className="shrink-0">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-indigo-200 transition" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {(u.displayName || u.username || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition">{u.displayName || u.username}</p>
            {u.isVerified && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px]">✓</span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">@{u.username}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {roleBadge(u.role)}
          {u.isBanned && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Banned</span>
          )}
          {u.isOnline && !u.isBanned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
            </span>
          )}
        </div>
        <div className="sm:hidden shrink-0">
          {u.isBanned ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Banned</span>
          ) : u.isOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
            </span>
          ) : null}
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total users</p>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, username, or email..."
          className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition min-h-[48px]"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 active:scale-95 transition min-h-[40px]"
        >
          Search
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => load()} className="ml-auto text-sm font-bold text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No users found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => <UserRow key={u.id} u={u} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page === 0}
            onClick={() => { const p = Math.max(0, page - limit); setPage(p); load(q, p, activeTab); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Previous
          </button>
          <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={users.length < limit}
            onClick={() => { const p = page + limit; setPage(p); load(q, p, activeTab); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
