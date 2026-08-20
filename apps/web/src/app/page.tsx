import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/Layout';

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.105V4.875A1.875 1.875 0 015.625 3h12.75A1.875 1.875 0 0120.25 4.875v10.5A1.875 1.875 0 0118.375 17.25H7.5l-3.75 2.855z" />
      </svg>
    ),
    title: 'Real-time Chat',
    desc: 'Instant messaging with friends, groups, and media sharing. Send texts, photos, videos, and voice messages.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    title: 'Voice & Video Calls',
    desc: 'Crystal-clear HD voice and video calls powered by WebRTC. Connect face to face from anywhere.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" />
      </svg>
    ),
    title: 'Social Feed',
    desc: 'Share posts, photos, and videos with the world. Like, comment, and engage with content you love.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Stories',
    desc: 'Share moments that disappear in 24 hours. Add text, stickers, drawings, and filters to your stories.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Groups',
    desc: 'Create and join group conversations. Chat with multiple friends at once and share content together.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'Custom Profiles',
    desc: 'Express yourself with custom profiles. Add bio, social links, cover photos, and your unique status.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Verified Badges',
    desc: 'Get verified and build trust. Verified accounts stand out with a unique badge on their profile.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: 'Premium Themes',
    desc: 'Choose from light and dark themes. Customize your app with beautiful font styles and colors.',
  },
];

const STEPS = [
  { num: '01', title: 'Download the App', desc: 'Get XYTEEE from the Google Play Store. It\'s completely free.' },
  { num: '02', title: 'Create Your Account', desc: 'Sign up with email, phone, or connect via Google or Telegram.' },
  { num: '03', title: 'Start Connecting', desc: 'Add friends, join groups, share posts, and make calls instantly.' },
];

export default function HomePage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.07]" />
        <div className="absolute inset-0 mesh-bg" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-slide-up">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Social Media, Reimagined
            </div>

            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up">
              <span className="text-gradient">Connect</span>{' '}
              <span className="text-gray-900">&amp;</span>{' '}
              <span className="text-gray-900">Share</span>
              <br />
              <span className="text-gray-900">Your World</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed animate-slide-up-delayed">
              Chat, call, post, and share stories with friends. XYTEEE brings everything together in one beautiful app.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up-delayed">
              <a
                href="https://xyteee.com"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:shadow-gray-900/30 hover:-translate-y-0.5"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17A1.5 1.5 0 014.5 2h15A1.5 1.5 0 0121 3.5v17l-9-4-9 4z" />
                </svg>
                Get on Google Play
              </a>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl text-base font-bold hover:bg-gray-50 hover:border-gray-300 transition-all hover:-translate-y-0.5"
              >
                Learn More
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </a>
            </div>
          </div>

          {/* App Icon Showcase */}
          <div className="mt-16 sm:mt-20 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand/20 via-accent-purple/20 to-accent-pink/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl p-6 shadow-2xl shadow-brand/10 border border-gray-100">
                <Image src="/app-icon.png" alt="XYTEEE App" width={160} height={160} className="rounded-2xl animate-float" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              XYTEEE packs all the features you love into one seamless experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-card-gradient border border-gray-100 rounded-2xl p-6 hover:shadow-card-hover hover:border-brand/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Start in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative text-center group">
                <div className="text-6xl font-extrabold text-brand/10 group-hover:text-brand/20 transition-colors mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                {step.num !== '03' && (
                  <div className="hidden md:block absolute top-10 right-0 translate-x-1/2 w-12 border-t-2 border-dashed border-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Showcase / Screenshots */}
      <section className="py-20 sm:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Why XYTEEE?</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                Built for Modern<br />Social Connection
              </h2>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                From real-time messaging to HD video calls, from sharing stories to building communities — XYTEEE is designed to make every interaction meaningful.
              </p>
              <ul className="space-y-4">
                {[
                  'End-to-end encrypted messaging',
                  'HD voice & video calls with WebRTC',
                  'Instagram-style stories with stickers & filters',
                  'Multi-account switching support',
                  'Customizable themes & font styles',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="phone-frame bg-gradient-to-br from-brand via-accent-purple to-accent-pink">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Image src="/app-icon.png" alt="" width={80} height={80} className="rounded-2xl mx-auto mb-4 shadow-lg" />
                    <p className="font-bold text-lg">XYTEEE</p>
                    <p className="text-white/70 text-sm">Your Social World</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 'Free', label: 'To Use' },
              { value: '24/7', label: 'Available' },
              { value: 'HD', label: 'Voice & Video' },
              { value: '100%', label: 'Private' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-extrabold text-gradient-brand mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gray-900 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-hero-gradient opacity-20" />
            <div className="absolute inset-0 mesh-bg opacity-50" />

            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
                Join XYTEEE Today
              </h2>
              <p className="text-gray-300 text-lg mb-10 max-w-lg mx-auto">
                Connect with friends, share your story, and experience social media the way it should be.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://xyteee.com"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl text-base font-bold hover:bg-gray-100 transition-all shadow-xl"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5v-17A1.5 1.5 0 014.5 2h15A1.5 1.5 0 0121 3.5v17l-9-4-9 4z" />
                  </svg>
                  Get on Google Play
                </a>
              </div>
              <p className="text-gray-400 text-sm mt-6">Coming soon on iOS</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
