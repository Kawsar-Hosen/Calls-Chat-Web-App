'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (!t) return;

    Promise.all([
      fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${API}/admin/users?limit=10&sort=created_at_desc`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ])
      .then(([s, u]) => {
        setStats(s);
        setRecentUsers(u.items || []);
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gray-200" /><div className="h-4 bg-gray-200 rounded w-20" /></div>
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <p className="text-gray-500 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const primaryStats = [
    { label: 'Total Users', value: stats.totalUsers, icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
    { label: 'Total Posts', value: stats.totalPosts, icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5', color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
    { label: 'Reports', value: stats.totalReports, icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color: 'from-orange-500 to-red-500', shadow: 'shadow-orange-200' },
    { label: 'Blog Posts', value: stats.totalBlogPosts, icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', color: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-200' },
  ];

  const secondaryStats = [
    { label: 'New Today', value: stats.newUsersToday, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Active Now', value: stats.activeUsersToday, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pending Reports', value: stats.pendingReports, color: 'text-amber-600 bg-amber-50' },
    { label: 'Pending Verifications', value: stats.pendingVerifications || 0, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Dashboard</h1>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {primaryStats.map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 sm:p-5 text-white shadow-lg ${c.shadow} hover:scale-[1.02] transition-transform duration-200`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold">{(c.value ?? 0).toLocaleString()}</p>
            <p className="text-sm text-white/80 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {secondaryStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-extrabold ${s.color.split(' ')[0]}`}>{(s.value ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Recent Registrations
            </h3>
            <Link href="/admin/users" className="text-xs text-indigo-600 font-bold hover:underline min-h-[44px] flex items-center">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No recent users</p>
            ) : (
              recentUsers.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/admin/users/detail?id=${u.id}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition group"
                >
                  <span className="text-xs text-gray-400 font-mono w-5 text-right">{i + 1}</span>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {(u.displayName || u.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition">{u.displayName || u.username}</p>
                    <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              Quick Actions
            </h3>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition font-bold text-sm min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              Broadcast Notification
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition font-bold text-sm min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              View Reports
              {stats.pendingReports > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pendingReports}</span>
              )}
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-bold text-sm min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              View Users
            </Link>
            <Link
              href="/admin/blog"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition font-bold text-sm min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Blog Post
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
