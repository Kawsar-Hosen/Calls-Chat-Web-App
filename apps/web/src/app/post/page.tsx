'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface PostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  verified_category: string | null;
}

interface PostMedia {
  url: string;
  mime_type: string;
}

interface PostData {
  id: string;
  content: string;
  visibility: string;
  created_at: string;
  author: PostAuthor;
  media: PostMedia[];
}

export default function PostPage() {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { setLoading(false); return; }
    fetch(`${API_URL}/public/posts/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (post) {
      document.title = `${post.author.display_name} on XYTEEE`;
    }
  }, [post]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">Loading...</div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">Post not found.</div>
      </Layout>
    );
  }

  return (
    <>
      <head>
        <meta property="og:title" content={`${post.author.display_name} on XYTEEE`} />
        <meta property="og:description" content={post.content?.slice(0, 200) || 'View this post on XYTEEE'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://xyteee.com/post?id=${post.id}`} />
        {post.author.avatar_url && <meta property="og:image" content={post.author.avatar_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${post.author.display_name} on XYTEEE`} />
        <meta name="twitter:description" content={post.content?.slice(0, 200) || 'View this post on XYTEEE'} />
      </head>
      <Layout>
        <article className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <Link href="/" className="text-brand text-sm font-bold mb-6 inline-block">&larr; Back to XYTEEE</Link>

              <div className="flex items-center gap-3 mb-6">
                {post.author.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                    {post.author.display_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-900">{post.author.display_name}</p>
                    {post.author.is_verified && (
                      <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">@{post.author.username}</p>
                </div>
              </div>

              {post.content && (
                <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line mb-6">{post.content}</p>
              )}

              {post.media.length > 0 && (
                <div className={`grid gap-2 mb-6 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.media.map((m, i) => (
                    <img key={i} src={m.url} alt="" className={`w-full rounded-xl object-cover ${post.media.length === 1 ? 'max-h-96' : 'h-48'}`} />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-400 pt-4 border-t border-gray-100">
                <span>{post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  Public
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <a
              href="https://xyteee.com"
              className="inline-block bg-brand text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-brand-dark transition-colors"
            >
              View in XYTEEE App
            </a>
            <p className="text-sm text-gray-400 mt-4">Join the conversation on XYTEEE</p>
          </div>
        </article>
      </Layout>
    </>
  );
}
