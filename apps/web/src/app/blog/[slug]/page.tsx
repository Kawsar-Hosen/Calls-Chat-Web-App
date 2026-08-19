import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

async function getBlogPost(slug: string) {
  const res = await fetch(`${API_URL}/public/blog/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-brand text-sm font-bold mb-4 inline-block">&larr; Back to Blog</Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded">{post.category}</span>
          {post.publishedAt && <span className="text-xs text-gray-400">{new Date(post.publishedAt).toLocaleDateString()}</span>}
        </div>
        <h1 className="text-4xl font-extrabold mb-4">{post.title}</h1>
        {post.authorName && (
          <div className="flex items-center gap-3 mb-8">
            {post.authorAvatar && <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-full" />}
            <div><p className="font-bold text-sm">{post.authorName}</p></div>
          </div>
        )}
        {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="w-full rounded-2xl mb-8" />}
        <div className="prose prose-lg max-w-none whitespace-pre-line">{post.content}</div>
      </article>
    </Layout>
  );
}
