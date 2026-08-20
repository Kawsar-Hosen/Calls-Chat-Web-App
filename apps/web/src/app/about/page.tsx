import Link from 'next/link';
import { Layout } from '@/components/Layout';

export default function AboutPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">About Us</p>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-6">
            Built with <span className="text-gradient">Purpose</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            XYTEEE is a modern social media platform designed to bring people closer through meaningful connections.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card-gradient border border-gray-100 rounded-2xl p-8 hover:shadow-card transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h2>
              <p className="text-gray-500 leading-relaxed">
                To create a free, open, and engaging social platform where people can connect, share, and communicate without barriers. We believe everyone deserves access to modern communication tools.
              </p>
            </div>

            <div className="bg-card-gradient border border-gray-100 rounded-2xl p-8 hover:shadow-card transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h2>
              <p className="text-gray-500 leading-relaxed">
                A world where social media brings people together rather than pushing them apart. We envision a platform that prioritizes genuine connections, user privacy, and positive experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">What Makes XYTEEE Special</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Real-time Messaging', desc: 'Instant messaging with text, photos, videos, voice messages, and file sharing.' },
              { title: 'HD Video Calls', desc: 'Crystal-clear video and voice calls powered by WebRTC technology.' },
              { title: 'Social Feed', desc: 'Share posts, stories, reactions, and connect with people worldwide.' },
              { title: 'Stories', desc: 'Share moments with your friends. Add stickers, drawings, and filters.' },
              { title: 'Groups', desc: 'Create and manage group conversations with multiple people.' },
              { title: 'Custom Profiles', desc: 'Personalize your profile with bio, cover photos, and social links.' },
              { title: 'Multi-Account', desc: 'Switch between multiple accounts seamlessly without logging out.' },
              { title: 'Verified Badges', desc: 'Get verified and build trust with your community.' },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-card transition-all">
                <div className="w-2 h-2 rounded-full bg-brand mt-2.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-500 mb-8">Have questions, feedback, or need support? We&apos;d love to hear from you.</p>
          <a
            href="mailto:support@xyteee.com"
            className="inline-flex items-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            support@xyteee.com
          </a>
        </div>
      </section>

      {/* Policy Links for Play Store */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Legal & Compliance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { href: '/policy', label: 'Privacy Policy', icon: '🔒' },
              { href: '/terms', label: 'Terms of Service', icon: '📄' },
              { href: '/data-safety', label: 'Data Safety', icon: '🛡️' },
              { href: 'mailto:support@xyteee.com', label: 'Contact Us', icon: '✉️' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-card hover:border-brand/20 transition-all"
              >
                <span className="text-2xl">{link.icon}</span>
                <p className="text-gray-700 font-bold text-sm mt-2">{link.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
