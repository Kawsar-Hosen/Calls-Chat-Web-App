'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function NewBlogPost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  const save = async (status: string) => {
    setSaving(true);
    const t = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/admin/blog`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ title, content, excerpt: excerpt || undefined, category, status }),
    });
    if (res.ok) router.push('/admin/blog');
    setSaving(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-6">New Blog Post</h1>
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
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your blog post here..." className="w-full px-4 py-3 rounded-xl border border-gray-300 min-h-[400px] font-mono text-sm" />
        <div className="flex gap-3">
          <button onClick={() => save('draft')} disabled={saving || !title} className="bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">Save Draft</button>
          <button onClick={() => save('published')} disabled={saving || !title || !content} className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50">Publish</button>
        </div>
      </div>
    </div>
  );
}
