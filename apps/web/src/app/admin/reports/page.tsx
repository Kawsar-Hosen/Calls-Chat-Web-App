'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (s = status) => {
    setLoading(true);
    const t = localStorage.getItem('admin_token');
    const params = new URLSearchParams({ limit: '30', offset: '0' });
    if (s) params.set('status', s);
    fetch(`${API}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { setReports(d.items || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    dismissed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
        {['', 'pending', 'reviewed', 'resolved', 'dismissed'].map(s => (
          <button key={s} onClick={() => { setStatus(s); load(s); }} className={`px-3 py-2 rounded-lg text-sm font-bold min-h-[44px] ${status === s ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'}`}>{s || 'All'}</button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-3">{total} reports</p>
      <div className="space-y-3">
        {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> : reports.map(r => (
          <Link key={r.id} href={`/admin/reports/detail?id=${r.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-1 rounded ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                <span className="text-xs text-gray-400">{r.type}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="font-bold">{r.reason}</p>
            <p className="text-sm text-gray-500">Reported by {r.reporterName || 'Unknown'}</p>
          </Link>
        ))}
        {!loading && reports.length === 0 && <p className="text-center text-gray-400 py-8">No reports found.</p>}
      </div>
    </div>
  );
}
