import Link from 'next/link';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold text-brand">XYTEEE</Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/blog" className="text-gray-600 hover:text-brand">Blog</Link>
            <Link href="/about" className="text-gray-600 hover:text-brand">About</Link>
            <Link href="/policy" className="text-gray-600 hover:text-brand">Policy</Link>
            <a href="https://xyteee.com" className="bg-brand text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-dark">Open App</a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} XYTEEE. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/policy" className="hover:text-brand">Privacy</Link>
            <Link href="/terms" className="hover:text-brand">Terms</Link>
            <Link href="/about" className="hover:text-brand">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
