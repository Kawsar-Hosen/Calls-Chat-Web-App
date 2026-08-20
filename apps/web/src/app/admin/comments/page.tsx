'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function CommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async (search = q, offset = page) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('q', search);
      const res = await fetch(`${API}/admin/comments?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load comments');
      const d = await res.json();
      setComments(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, []);

  const handleSearch = () => {
    setPage(0);
    load(q, 0);
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    setDeleting(commentId);
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/comments/${commentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setTotal(prev => prev - 1);
      }
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(page / limit) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Comments</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total comments</p>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search comments by content or author..."
          className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition min-h-[48px]"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 active:scale-95 transition min-h-[40px]"
        >
          Search
        </button>
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
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-200" /><div className="space-y-1.5 flex-1"><div className="h-4 bg-gray-200 rounded w-1/4" /><div className="h-3 bg-gray-100 rounded w-1/6" /></div></div>
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No comments found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {c.authorAvatarUrl ? (
                    <img src={c.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                      {(c.authorDisplayName || c.authorUsername || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-900">{c.authorDisplayName || c.authorUsername}</span>
                    <span className="text-xs text-gray-400">@{c.authorUsername}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {c.postId && (
                      <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                        Post
                      </span>
                    )}
                    {c.likeCount !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        {c.likeCount}
                      </span>
                    )}
                    <button
                      onClick={() => deleteComment(c.id)}
                      disabled={deleting === c.id}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-95 transition disabled:opacity-40 min-h-[36px]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      {deleting === c.id ? '...' : 'Delete'}
                    </button>
                  </div>
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
            onClick={() => { const p = Math.max(0, page - limit); setPage(p); load(q, p); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Previous
          </button>
          <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={comments.length < limit}
            onClick={() => { const p = page + limit; setPage(p); load(q, p); }}
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
