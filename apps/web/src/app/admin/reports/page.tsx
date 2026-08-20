'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  reviewed: 'bg-blue-100 text-blue-700 border border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  dismissed: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const TYPE_STYLES: Record<string, string> = {
  spam: 'bg-orange-100 text-orange-700',
  harassment: 'bg-red-100 text-red-700',
  inappropriate: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 30;

  const load = useCallback(async (s = activeTab, offset = page) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (s) params.set('status', s);
      const res = await fetch(`${API}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load reports');
      const d = await res.json();
      setReports(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { load(); }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(0);
    load(tab, 0);
  };

  const autoBan = async (reportId: string) => {
    if (!confirm('Ban the reporter and delete the reported content?')) return;
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/reports/${reportId}/auto-ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      }
    } catch { /* ignore */ }
  };

  const dismiss = async (reportId: string) => {
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r));
      }
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(page / limit) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total reports</p>
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
          <span className="text-red-500 text-lg">!</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => load()} className="ml-auto text-sm font-bold text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-2"><div className="h-6 w-16 bg-gray-200 rounded-full" /><div className="h-4 w-24 bg-gray-200 rounded" /></div>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No reports found</p>
          <p className="text-gray-400 text-sm mt-1">All clear in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TYPE_STYLES[r.type] || TYPE_STYLES.other}`}>{r.type}</span>
                      <span className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    <p className="font-bold text-gray-900 mb-1">{r.reason}</p>
                    <p className="text-sm text-gray-500">
                      Reported by <span className="font-medium text-gray-700">{r.reporterName || r.reporterUsername || 'Unknown'}</span>
                    </p>
                    {r.targetContent && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2 italic">&quot;{r.targetContent}&quot;</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => autoBan(r.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 active:scale-95 transition min-h-[40px]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        Auto-Ban
                      </button>
                      <button
                        onClick={() => dismiss(r.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 active:scale-95 transition min-h-[40px]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Dismiss
                      </button>
                    </>
                  )}
                  {r.targetId && (
                    <Link
                      href={`/admin/posts?highlight=${r.targetId}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition min-h-[40px]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                      View Content
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page === 0}
            onClick={() => { const p = Math.max(0, page - limit); setPage(p); load(activeTab, p); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Previous
          </button>
          <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={reports.length < limit}
            onClick={() => { const p = page + limit; setPage(p); load(activeTab, p); }}
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
