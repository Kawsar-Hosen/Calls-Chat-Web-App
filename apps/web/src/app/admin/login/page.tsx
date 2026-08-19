'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_name: 'Admin Panel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      if (data.user.role !== 'super_admin' && data.user.role !== 'admin') throw new Error('Not an admin account');
      localStorage.setItem('admin_token', data.access_token);
      router.push('/admin/dashboard');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-2xl font-extrabold text-center mb-6">XYTEEE Admin</h1>
        <div className="space-y-4">
          <input type="email" placeholder="Admin email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand text-white py-3 rounded-xl font-bold hover:bg-brand-dark disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
        </div>
      </form>
    </div>
  );
}
