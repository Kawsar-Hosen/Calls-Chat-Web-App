'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/blog?limit=50`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => setPosts(d.items || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const deletePost = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    const t = localStorage.getItem('admin_token');
    await fetch(`${API}/admin/blog/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <p className="text-sm text-gray-500">{posts.length} posts</p>
        <Link href="/admin/blog/new" className="bg-brand text-white px-4 py-3 rounded-xl font-bold text-sm min-h-[44px] flex items-center">New Post</Link>
      </div>
      <div className="space-y-3">
        {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> : posts.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                  <span className="text-xs text-gray-400">{p.category}</span>
                </div>
                <h3 className="font-bold mt-1 truncate">{p.title}</h3>
                <p className="text-xs text-gray-400">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'Draft'}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link href={`/admin/blog/edit?id=${p.id}`} className="text-brand text-sm font-bold min-h-[44px] flex items-center">Edit</Link>
                <button onClick={() => deletePost(p.id)} className="text-red-500 text-sm font-bold min-h-[44px] flex items-center">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && posts.length === 0 && <p className="text-center text-gray-400 py-8">No blog posts yet. Create your first one!</p>}
      </div>
    </div>
  );
}
