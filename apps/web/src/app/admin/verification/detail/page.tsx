'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const CATEGORY_COLORS: Record<string, string> = {
  business: 'bg-blue-100 text-blue-700 border-blue-200',
  personal: 'bg-green-100 text-green-700 border-green-200',
  government: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  media: 'bg-orange-100 text-orange-700 border-orange-200',
  sports: 'bg-pink-100 text-pink-700 border-pink-200',
  music: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function VerificationDetailPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('id');
    if (!q) { router.push('/admin/verification'); return; }
    setId(q);
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/verification/${q}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(setRequest).catch(() => router.push('/admin/verification')).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (status: string) => {
    setSaving(true);
    const t = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/admin/verification/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status, admin_notes: adminNotes || undefined }),
    });
    if (res.ok) setRequest((prev: any) => ({ ...prev, status }));
    setSaving(false);
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!request) return <p className="text-red-500">Request not found</p>;

  let docUrls: string[] = [];
  try { docUrls = request.documentUrls || []; } catch {}

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-brand text-sm font-bold mb-4">&larr; Back</button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          {request.avatarUrl && <img src={request.avatarUrl} alt="" className="w-16 h-16 rounded-full" />}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold">{request.displayName}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${CATEGORY_COLORS[request.category] || ''}`}>{request.category}</span>
            </div>
            <p className="text-gray-500 text-sm">@{request.username} &middot; Requested as: {request.reqDisplayName}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(request.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-bold text-sm mb-2">Reason</h3>
          <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-4">{request.reason}</p>
        </div>

        {docUrls.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-bold text-sm mb-2">Documents ({docUrls.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {docUrls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block bg-gray-50 rounded-lg p-3 text-xs text-brand hover:bg-gray-100 truncate">{url}</a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-bold text-sm mb-2">Admin Notes</h3>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes about this decision..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" rows={3} />
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={() => updateStatus('approved')} disabled={saving || request.status === 'approved'} className="bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50">Approve & Verify</button>
          <button onClick={() => updateStatus('rejected')} disabled={saving || request.status === 'rejected'} className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50">Reject</button>
        </div>
      </div>
    </div>
  );
}
