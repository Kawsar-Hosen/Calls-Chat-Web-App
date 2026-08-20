'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const load = useCallback(async (search = q, offset = page) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('q', search);
      const res = await fetch(`${API}/admin/stories?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load stories');
      const d = await res.json();
      setStories(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setError('Failed to load stories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, []);

  const handleSearch = () => {
    setPage(0);
    load(q, 0);
  };

  const expandStory = async (storyId: string) => {
    if (expandedStory === storyId) { setExpandedStory(null); return; }
    setExpandedStory(storyId);
    setExpandedLoading(true);
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/stories/${storyId}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setExpandedData(data);
      }
    } catch { /* ignore */ }
    setExpandedLoading(false);
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm('Delete this story?')) return;
    setDeleting(true);
    try {
      const t = localStorage.getItem('admin_token');
      await fetch(`${API}/admin/stories/${storyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      setStories(prev => prev.filter(s => s.id !== storyId));
      setTotal(prev => prev - 1);
      if (expandedStory === storyId) setExpandedStory(null);
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(page / limit) + 1;

  function timeLeft(expiresAt: string): string {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function isExpiringSoon(expiresAt: string): boolean {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 3600000;
  }

  function mediaTypeIcon(type: string) {
    if (type === 'image') return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
        Image
      </span>
    );
    if (type === 'video') return (
      <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
        Video
      </span>
    );
    if (type === 'text') return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full font-bold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        Text
      </span>
    );
    return <span className="text-xs text-gray-400">{type || 'unknown'}</span>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Stories</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total stories</p>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search stories by author or content..."
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
      ) : stories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No stories found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {s.authorAvatarUrl ? (
                      <img src={s.authorAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                        {(s.authorDisplayName || s.authorUsername || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 truncate">{s.authorDisplayName || s.authorUsername}</span>
                      <span className="text-xs text-gray-400">@{s.authorUsername}</span>
                      {s.expiresAt && isExpiringSoon(s.expiresAt) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.content || 'No text content'}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {mediaTypeIcon(s.mediaType)}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {(s.viewCount ?? 0).toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                      </span>
                      {s.expiresAt && (
                        <span className={`flex items-center gap-1 text-xs ${isExpiringSoon(s.expiresAt) ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {timeLeft(s.expiresAt)}
                        </span>
                      )}
                      <button
                        onClick={() => expandStory(s.id)}
                        className="ml-auto text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 transition"
                      >
                        {expandedStory === s.id ? 'Collapse' : 'View Details'}
                        <svg className={`w-3 h-3 transition-transform ${expandedStory === s.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {expandedStory === s.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                  {expandedLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  ) : expandedData ? (
                    <>
                      {expandedData.content && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Content</label>
                          <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{expandedData.content}</p>
                        </div>
                      )}

                      {expandedData.mediaUrls && expandedData.mediaUrls.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Media ({expandedData.mediaUrls.length})</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {expandedData.mediaUrls.map((url: string, i: number) => (
                              expandedData.mediaType === 'video' ? (
                                <video key={i} src={url} controls className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                              ) : (
                                <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">Viewers</p>
                          <p className="text-lg font-extrabold text-gray-900">{(expandedData.viewCount ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">Type</p>
                          <p className="text-lg font-extrabold text-gray-900 capitalize">{expandedData.mediaType || 'text'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">Created</p>
                          <p className="text-sm font-bold text-gray-900">{expandedData.createdAt ? new Date(expandedData.createdAt).toLocaleString() : ''}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">Expires</p>
                          <p className="text-sm font-bold text-gray-900">{expandedData.expiresAt ? new Date(expandedData.expiresAt).toLocaleString() : 'Never'}</p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => deleteStory(s.id)}
                          disabled={deleting}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-95 transition min-h-[44px]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          {deleting ? 'Deleting...' : 'Delete Story'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
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
            disabled={stories.length < limit}
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
