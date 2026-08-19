'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/posts?limit=30`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { setPosts(d.items || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const t = localStorage.getItem('admin_token');
    await fetch(`${API}/admin/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setPosts(prev => prev.filter(p => p.id !== id));
    setTotal(prev => prev - 1);
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{total} posts total</p>
      <div className="space-y-3">
        {loading ? <p className="text-gray-400">Loading...</p> : posts.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-brand">@{p.authorUsername}</span>
              <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">{p.content}</p>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs px-2 py-0.5 rounded ${p.visibility === 'public' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.visibility}</span>
              <button onClick={() => deletePost(p.id)} className="text-xs text-red-500 font-bold hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {!loading && posts.length === 0 && <p className="text-center text-gray-400 py-8">No posts found.</p>}
      </div>
    </div>
  );
}
