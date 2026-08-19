'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (!t) return;
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!stats) return <p className="text-red-500">Failed to load stats</p>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { label: 'Total Posts', value: stats.totalPosts, icon: '📝', color: 'bg-green-500' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: '🚩', color: 'bg-red-500' },
    { label: 'Total Reports', value: stats.totalReports, icon: '📋', color: 'bg-orange-500' },
    { label: 'Blog Posts', value: stats.totalBlogPosts, icon: '📰', color: 'bg-purple-500' },
    { label: 'New Today', value: stats.newUsersToday, icon: '🆕', color: 'bg-cyan-500' },
    { label: 'Active Now', value: stats.activeUsersToday, icon: '🟢', color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center text-white text-lg`}>{c.icon}</span>
              <span className="text-sm text-gray-500">{c.label}</span>
            </div>
            <p className="text-3xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
