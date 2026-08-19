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
  const [durationDays, setDurationDays] = useState<number>(365);
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
    const body: Record<string, any> = { status };
    if (adminNotes) body.admin_notes = adminNotes;
    if (status === 'approved') body.duration_days = durationDays;
    const res = await fetch(`${API}/admin/verification/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
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
      <button onClick={() => router.back()} className="text-brand text-sm font-bold mb-4 min-h-[44px] flex items-center">&larr; Back</button>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          {request.avatarUrl ? <img src={request.avatarUrl} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full shrink-0" /> : <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-lg shrink-0">{(request.displayName || 'U')[0].toUpperCase()}</div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold truncate">{request.displayName}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[request.category] || ''}`}>{request.category}</span>
            </div>
            <p className="text-gray-500 text-sm truncate">@{request.username} · Requested as: {request.reqDisplayName}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(request.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-bold text-sm mb-2">Reason</h3>
          <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-4 text-sm">{request.reason}</p>
        </div>

        {docUrls.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-bold text-sm mb-2">Documents ({docUrls.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {docUrls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block bg-gray-50 rounded-lg p-3 text-xs text-brand hover:bg-gray-100 truncate min-h-[44px]">{url}</a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-bold text-sm mb-2">Admin Notes</h3>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes about this decision..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm min-h-[80px]" rows={3} />
        </div>

        {request.status === 'pending' && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-bold text-sm mb-2">Verification Duration</h3>
            <select value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm min-h-[44px]">
              <option value={3}>3 Days (Trial)</option>
              <option value={30}>30 Days</option>
              <option value={365}>1 Year (Default)</option>
            </select>
          </div>
        )}

        {request.verifiedUntil && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-500">Verified until: {new Date(request.verifiedUntil).toLocaleString()}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button onClick={() => updateStatus('approved')} disabled={saving || request.status === 'approved'} className="bg-green-500 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 min-h-[44px]">Approve & Verify</button>
          <button onClick={() => updateStatus('rejected')} disabled={saving || request.status === 'rejected'} className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 min-h-[44px]">Reject</button>
        </div>
      </div>
    </div>
  );
}
