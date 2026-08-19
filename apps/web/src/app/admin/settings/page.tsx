'use client';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-6">Settings</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-lg mb-2">Admin Panel</h2>
          <p className="text-sm text-gray-500">Admin panel settings and information.</p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm"><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}</p>
          <p className="text-sm"><strong>App URL:</strong> {process.env.NEXT_PUBLIC_APP_URL || 'https://xyteee.com'}</p>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-bold mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-500 mb-2">Admin actions that affect the entire platform.</p>
        </div>
      </div>
    </div>
  );
}
