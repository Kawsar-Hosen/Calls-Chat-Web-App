'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/reports', icon: '🚩', label: 'Reports' },
  { href: '/admin/verification', icon: '✅', label: 'Verification' },
  { href: '/admin/posts', icon: '📝', label: 'Posts' },
  { href: '/admin/blog', icon: '📰', label: 'Blog' },
  { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const t = localStorage.getItem('admin_token');
    if (!t) { router.push('/admin/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/profile`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then(r => r.ok ? r.json() : Promise.reject()).then(u => {
      if (u.role !== 'super_admin' && u.role !== 'admin') { router.push('/admin/login'); return; }
      setUser(u);
    }).catch(() => router.push('/admin/login'));
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <Link href="/admin/dashboard" className="text-xl font-extrabold text-brand">XYTEEE Admin</Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === n.href || pathname.startsWith(n.href + '/') ? 'bg-brand text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          {user && <p className="text-xs text-gray-500 px-3 mb-2">{user.displayName}</p>}
          <button onClick={() => { localStorage.removeItem('admin_token'); router.push('/admin/login'); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg">Logout</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 h-16 flex items-center">
          <h2 className="text-lg font-bold text-gray-800">{NAV.find(n => pathname.startsWith(n.href))?.label || 'Admin'}</h2>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
