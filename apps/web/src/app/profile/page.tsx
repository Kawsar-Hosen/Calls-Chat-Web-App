'use client';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get('u');
    if (!username) { setError(true); setLoading(false); return; }
    Promise.all([
      fetch(`${API_URL}/public/users/${username}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_URL}/public/users/${username}/posts?limit=20`).then(r => r.ok ? r.json() : { items: [] }),
    ]).then(([p, pos]) => { setProfile(p); setPosts(pos.items || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">Loading...</div></Layout>;
  if (error || !profile) return <Layout><div className="text-center py-20 text-gray-400">Profile not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {profile.coverUrl && <img src={profile.coverUrl} alt="Cover" className="w-full h-48 object-cover" />}
          <div className="px-6 pb-6">
            <div className="flex items-end -mt-12 mb-4">
              <img src={profile.avatarUrl || '/default-avatar.png'} alt={profile.displayName} className="w-24 h-24 rounded-full border-4 border-white object-cover" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold">{profile.displayName}</h1>
              {profile.isVerified && <span className="text-brand text-lg">✓</span>}
            </div>
            <p className="text-gray-500 mb-3">@{profile.username}</p>
            {profile.bio && <p className="text-gray-700 mb-4 whitespace-pre-line">{profile.bio}</p>}
            <div className="flex gap-6 text-sm text-gray-500">
              <span><strong className="text-gray-900">{profile.postCount}</strong> posts</span>
              <span><strong className="text-gray-900">{profile.followerCount}</strong> followers</span>
              <span><strong className="text-gray-900">{profile.followingCount}</strong> following</span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>❤️ {post.likeCount}</span>
                <span>💬 {post.commentCount}</span>
                <span>🔄 {post.shareCount}</span>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-gray-400 py-8">No public posts yet.</p>}
        </div>

        <div className="mt-6 text-center">
          <a href="https://xyteee.com" className="inline-block bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-dark transition">
            Open in XYTEEE App
          </a>
        </div>
      </div>
    </Layout>
  );
}
