import Link from 'next/link';
import Image from 'next/image';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/app-icon.png" alt="XYTEEE" width={34} height={34} className="rounded-xl shadow-sm group-hover:shadow-md transition-shadow" />
            <span className="text-xl font-extrabold tracking-tight text-gray-900">XYTEEE</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/#features" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand rounded-lg hover:bg-brand/5 transition-all">
              Features
            </Link>
            <Link href="/about" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand rounded-lg hover:bg-brand/5 transition-all">
              About
            </Link>
            <Link href="/policy" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand rounded-lg hover:bg-brand/5 transition-all">
              Privacy
            </Link>
            <Link href="/terms" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand rounded-lg hover:bg-brand/5 transition-all">
              Terms
            </Link>
            <Link href="/data-safety" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand rounded-lg hover:bg-brand/5 transition-all">
              Data Safety
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://xyteee.com"
              className="hidden sm:inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              Open App
            </a>
            <button className="sm:hidden p-2 text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/app-icon.png" alt="XYTEEE" width={32} height={32} className="rounded-xl" />
                <span className="text-xl font-extrabold text-white">XYTEEE</span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                Connect with friends, share moments, and communicate freely on the social platform built for you.
              </p>
              <div className="flex gap-3">
                <a href="https://xyteee.com" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-brand transition-colors">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.98-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </a>
                <a href="https://xyteee.com" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-green-600 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 20.5v-17A1.5 1.5 0 014.5 2h15A1.5 1.5 0 0121 3.5v17l-9-4-9 4z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><a href="https://xyteee.com" className="hover:text-white transition-colors">Open App</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/data-safety" className="hover:text-white transition-colors">Data Safety</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Connect</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="mailto:support@xyteee.com" className="hover:text-white transition-colors">support@xyteee.com</a></li>
                <li><Link href="/about" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">&copy; {new Date().getFullYear()} XYTEEE. All rights reserved.</p>
            <div className="flex gap-4 text-xs">
              <Link href="/policy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/data-safety" className="hover:text-white transition-colors">Data Safety</Link>
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
