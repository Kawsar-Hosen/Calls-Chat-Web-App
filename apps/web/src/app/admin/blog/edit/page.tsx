'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function EditBlogPost() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('general');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('id');
    if (!q) { router.push('/admin/blog'); return; }
    setId(q);
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/blog/${q}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(p => { setTitle(p.title); setContent(p.content); setExcerpt(p.excerpt || ''); setCategory(p.category); setStatus(p.status); })
      .catch(() => router.push('/admin/blog')).finally(() => setLoading(false));
  }, []);

  const save = async (newStatus?: string) => {
    setSaving(true);
    const t = localStorage.getItem('admin_token');
    const body: any = { title, content, excerpt: excerpt || null, category };
    if (newStatus) body.status = newStatus;
    const res = await fetch(`${API}/admin/blog/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { const p = await res.json(); setStatus(p.status); }
    setSaving(false);
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-6">Edit Blog Post</h1>
      <div className="space-y-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand outline-none text-lg font-bold" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300">
          <option value="general">General</option>
          <option value="update">Update</option>
          <option value="policy">Policy</option>
          <option value="story">Story</option>
          <option value="news">News</option>
        </select>
        <input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Excerpt (optional)" className="w-full px-4 py-2.5 rounded-xl border border-gray-300" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Content..." className="w-full px-4 py-3 rounded-xl border border-gray-300 min-h-[400px] font-mono text-sm" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Status: <strong>{status}</strong></span>
          <button onClick={() => save()} disabled={saving} className="bg-gray-600 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50">Save</button>
          {status !== 'published' && <button onClick={() => save('published')} disabled={saving} className="bg-brand text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50">Publish</button>}
          {status !== 'draft' && <button onClick={() => save('draft')} disabled={saving} className="bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50">Unpublish</button>}
        </div>
      </div>
    </div>
  );
}
