'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/reports/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(setReport).catch(() => router.push('/admin/reports')).finally(() => setLoading(false));
  }, [id]);

  const resolve = async (status: string) => {
    const t = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/admin/reports/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status, action_taken: actionTaken || undefined, resolution_notes: notes || undefined }),
    });
    if (res.ok) { const d = await res.json(); setReport((prev: any) => ({ ...prev, status })); }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!report) return <p className="text-red-500">Report not found</p>;

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-brand text-sm font-bold mb-4">&larr; Back</button>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-bold px-2 py-1 rounded ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{report.status}</span>
          <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
        </div>
        <h1 className="text-xl font-extrabold mb-2">{report.reason}</h1>
        <p className="text-sm text-gray-500 mb-1">Type: {report.type}</p>
        <p className="text-sm text-gray-500 mb-1">Target: {report.targetId || 'N/A'}</p>
        <p className="text-sm text-gray-500 mb-4">Reported by: {report.reporterName} (@{report.reporterId?.slice(0, 8)})</p>
        {report.details && <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 mb-4">{report.details}</div>}

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <input value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="Action taken (e.g., Warning sent)" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Resolution notes..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" rows={3} />
          <div className="flex gap-3">
            <button onClick={() => resolve('resolved')} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600">Resolve</button>
            <button onClick={() => resolve('dismissed')} className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-500">Dismiss</button>
            <button onClick={() => resolve('reviewed')} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600">Mark Reviewed</button>
          </div>
        </div>
      </div>
    </div>
  );
}
