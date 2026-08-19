import Link from 'next/link';
import { Layout } from '@/components/Layout';

export default function HomePage() {
  return (
    <Layout>
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-brand">XYTEEE</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Connect with friends. Share posts, stories, and moments.
          </p>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            Free voice & video calls, real-time chat, social feed, and more — all in one app.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="https://xyteee.com" className="bg-brand text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-brand-dark transition">
              Open XYTEEE
            </a>
            <Link href="/blog" className="bg-white border border-gray-300 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 transition">
              Read Blog
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: '💬', title: 'Real-time Chat', desc: 'Instant messaging with friends, groups, and media sharing.' },
          { icon: '📞', title: 'Voice & Video Calls', desc: 'Crystal-clear calls powered by WebRTC technology.' },
          { icon: '📱', title: 'Social Feed', desc: 'Share posts, stories, reactions, and connect with the world.' },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-8 border border-gray-200 text-center hover:shadow-lg transition">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </Layout>
  );
}
