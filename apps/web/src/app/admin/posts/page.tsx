'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type Tab = { key: string; label: string };
const TABS: Tab[] = [
  { key: '', label: 'All' },
  { key: 'public', label: 'Public' },
  { key: 'friends', label: 'Friends' },
  { key: 'private', label: 'Private' },
  { key: 'deleted', label: 'Deleted' },
];

const VISIBILITY_STYLES: Record<string, string> = {
  public: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  friends: 'bg-blue-100 text-blue-700 border border-blue-200',
  private: 'bg-gray-100 text-gray-600 border border-gray-200',
  deleted: 'bg-red-100 text-red-700 border border-red-200',
};

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const limit = 30;

  const load = useCallback(async (search = q, offset = page, vis = activeTab) => {
    setLoading(true);
    setError('');
    try {
      const t = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('q', search);
      if (vis) params.set('visibility', vis);
      const res = await fetch(`${API}/admin/posts?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load posts');
      const d = await res.json();
      setPosts(d.items || []);
      setTotal(d.total || 0);
    } catch {
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, page, activeTab]);

  useEffect(() => { load(); }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(0);
    setSelected(new Set());
    load(q, 0, tab);
  };

  const expandPost = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    setExpandedLoading(true);
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/posts/${postId}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setExpandedData(data);
        setEditContent(data.content || '');
      }
    } catch { /* ignore */ }
    setExpandedLoading(false);
  };

  const savePost = async (postId: string) => {
    setEditing(true);
    try {
      const t = localStorage.getItem('admin_token');
      const res = await fetch(`${API}/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExpandedData(updated);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent } : p));
      }
    } catch { /* ignore */ }
    setEditing(false);
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    const t = localStorage.getItem('admin_token');
    await fetch(`${API}/admin/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setPosts(prev => prev.filter(p => p.id !== postId));
    setTotal(prev => prev - 1);
    if (expandedPost === postId) setExpandedPost(null);
    setSelected(prev => { const n = new Set(prev); n.delete(postId); return n; });
  };

  const toggleSelect = (postId: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(postId)) n.delete(postId); else n.add(postId);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === posts.length) setSelected(new Set());
    else setSelected(new Set(posts.map(p => p.id)));
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} posts?`)) return;
    setBulkDeleting(true);
    const t = localStorage.getItem('admin_token');
    for (const postId of selected) {
      await fetch(`${API}/admin/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    }
    setPosts(prev => prev.filter(p => !selected.has(p.id)));
    setTotal(prev => prev - selected.size);
    setSelected(new Set());
    setBulkDeleting(false);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(page / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total posts</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 active:scale-95 transition min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete {selected.size} Selected
          </button>
        )}
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(q, 0, activeTab)}
          placeholder="Search posts by content or author..."
          className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition min-h-[48px]"
        />
        <button
          onClick={() => { setPage(0); load(q, 0, activeTab); }}
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

      {posts.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 font-medium hover:text-indigo-600 transition min-h-[44px]"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${selected.size === posts.length && posts.length > 0 ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
              {selected.size === posts.length && posts.length > 0 && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              )}
            </div>
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </button>
        </div>
      )}

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
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No posts found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className="shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition"
                    style={{ borderColor: selected.has(p.id) ? '#4F46E5' : '#D1D5DB', backgroundColor: selected.has(p.id) ? '#4F46E5' : 'transparent' }}
                  >
                    {selected.has(p.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {p.authorAvatarUrl ? (
                          <img src={p.authorAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">{(p.authorUsername || 'U')[0].toUpperCase()}</div>
                        )}
                        <span className="font-bold text-sm text-gray-900">{p.authorDisplayName || p.authorUsername}</span>
                        <span className="text-xs text-gray-400">@{p.authorUsername}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3 cursor-pointer hover:text-gray-900 transition" onClick={() => expandPost(p.id)}>{p.content}</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${VISIBILITY_STYLES[p.visibility] || VISIBILITY_STYLES.public}`}>{p.visibility}</span>
                      {p.mediaUrls && p.mediaUrls.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                          {p.mediaUrls.length} media
                        </span>
                      )}
                      {p.reactionCount !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                          {p.reactionCount}
                        </span>
                      )}
                      {p.commentCount !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                          {p.commentCount}
                        </span>
                      )}
                      <button
                        onClick={() => expandPost(p.id)}
                        className="ml-auto text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 transition"
                      >
                        {expandedPost === p.id ? 'Collapse' : 'View Details'}
                        <svg className={`w-3 h-3 transition-transform ${expandedPost === p.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {expandedPost === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4 animate-in fade-in slide-in-from-top-1">
                  {expandedLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  ) : expandedData ? (
                    <>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Content</label>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none bg-white transition"
                        />
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => savePost(p.id)}
                            disabled={editing || editContent === expandedData.content}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition min-h-[40px]"
                          >
                            {editing ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => setEditContent(expandedData.content)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition min-h-[40px]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {expandedData.mediaUrls && expandedData.mediaUrls.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Media</label>
                          <div className="grid grid-cols-3 gap-2">
                            {expandedData.mediaUrls.map((url: string, i: number) => (
                              <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                            ))}
                          </div>
                        </div>
                      )}

                      {expandedData.comments && expandedData.comments.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Comments ({expandedData.comments.length})</label>
                          <div className="space-y-2">
                            {expandedData.comments.map((c: any) => (
                              <div key={c.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs font-bold text-gray-700">{c.authorDisplayName || c.authorUsername}</p>
                                <p className="text-sm text-gray-600 mt-0.5">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-500">Visibility:</label>
                          <select
                            value={expandedData.visibility}
                            onChange={async e => {
                              const t = localStorage.getItem('admin_token');
                              const res = await fetch(`${API}/admin/posts/${p.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                body: JSON.stringify({ visibility: e.target.value }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setExpandedData(updated);
                                setPosts(prev => prev.map(post => post.id === p.id ? { ...post, visibility: e.target.value } : post));
                              }
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white min-h-[40px]"
                          >
                            <option value="public">Public</option>
                            <option value="friends">Friends</option>
                            <option value="private">Private</option>
                          </select>
                        </div>
                        <button
                          onClick={() => deletePost(p.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition min-h-[40px] sm:ml-auto"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          Delete Post
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
            onClick={() => { const p = Math.max(0, page - limit); setPage(p); load(q, p, activeTab); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Previous
          </button>
          <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={posts.length < limit}
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
