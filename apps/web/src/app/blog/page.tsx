import Link from 'next/link';
import { Layout } from '@/components/Layout';

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

async function getBlogPosts() {
  const res = await fetch(`${API_URL}/public/blog?limit=20`, { cache: 'no-store' });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-8">Blog</h1>
        <div className="space-y-6">
          {posts.items?.map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition">
              {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="w-full h-48 object-cover rounded-xl mb-4" />}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded">{post.category}</span>
                <span className="text-xs text-gray-400">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</span>
              </div>
              <h2 className="text-xl font-bold mb-2">{post.title}</h2>
              {post.excerpt && <p className="text-gray-500">{post.excerpt}</p>}
            </Link>
          ))}
          {(!posts.items || posts.items.length === 0) && <p className="text-center text-gray-400 py-8">No blog posts yet.</p>}
        </div>
      </div>
    </Layout>
  );
}
