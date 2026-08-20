'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function SettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);

  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (!t) return;

    fetch(`${API}/admin/settings`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d.maintenanceMode !== undefined) setMaintenance(d.maintenanceMode);
        if (d.registrationOpen !== undefined) setRegistrationOpen(d.registrationOpen);
      })
      .catch(() => {});

    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { if (d.totalUsers) setTotalUsers(d.totalUsers); })
      .catch(() => {});

    fetch(`${API}/admin/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(setAdminInfo)
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const t = localStorage.getItem('admin_token');
      await fetch(`${API}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ maintenanceMode: maintenance, registrationOpen }),
      });
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const sendBroadcast = async () => {
    setBroadcastSending(true);
    try {
      const t = localStorage.getItem('admin_token');
      await fetch(`${API}/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, type: broadcastType }),
      });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setShowBroadcastConfirm(false);
      setSuccessMsg('Notification broadcast sent successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { /* ignore */ }
    setBroadcastSending(false);
  };

  const resetVerification = async () => {
    setResetting(true);
    try {
      const t = localStorage.getItem('admin_token');
      await fetch(`${API}/admin/reset-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      setShowResetConfirm(false);
      setSuccessMsg('All verification has been reset');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { /* ignore */ }
    setResetting(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform settings and send notifications</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-emerald-500 text-lg">✓</span>
          <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Platform Settings
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Maintenance Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">Temporarily disable public access</p>
              </div>
              <button
                onClick={() => setMaintenance(!maintenance)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenance ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${maintenance ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {maintenance && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-600 font-medium">Maintenance mode is active. Public users cannot access the platform.</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Registration Open</p>
                <p className="text-xs text-gray-500 mt-0.5">Allow new user signups</p>
              </div>
              <button
                onClick={() => setRegistrationOpen(!registrationOpen)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${registrationOpen ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${registrationOpen ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition min-h-[48px]"
            >
              {saving ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>
              ) : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Broadcast Notification */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              Broadcast Notification
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Title</label>
              <input
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition min-h-[48px]"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Message</label>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Write your broadcast message..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none transition min-h-[88px]"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'info', label: 'Info', color: 'border-blue-300 bg-blue-50 text-blue-700', active: 'border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-200' },
                  { value: 'warning', label: 'Warning', color: 'border-amber-300 bg-amber-50 text-amber-700', active: 'border-amber-500 bg-amber-100 text-amber-700 ring-2 ring-amber-200' },
                  { value: 'announcement', label: 'Announcement', color: 'border-purple-300 bg-purple-50 text-purple-700', active: 'border-purple-500 bg-purple-100 text-purple-700 ring-2 ring-purple-200' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setBroadcastType(t.value)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition min-h-[44px] ${broadcastType === t.value ? t.active : t.color + ' opacity-60'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400">Will be sent to {totalUsers.toLocaleString()} users</p>

            {!showBroadcastConfirm ? (
              <button
                onClick={() => { if (broadcastTitle && broadcastMessage) setShowBroadcastConfirm(true); }}
                disabled={!broadcastTitle || !broadcastMessage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[48px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                Send to All Users
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-amber-700 font-bold">Send this notification to all {totalUsers.toLocaleString()} users?</p>
                <p className="text-xs text-amber-600">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBroadcastConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition min-h-[48px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendBroadcast}
                    disabled={broadcastSending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition min-h-[48px]"
                  >
                    {broadcastSending ? 'Sending...' : 'Confirm Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Info */}
      {adminInfo && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              Admin Info
            </h3>
          </div>
          <div className="p-6 flex items-center gap-4">
            {adminInfo.avatarUrl ? (
              <img src={adminInfo.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">{(adminInfo.displayName || adminInfo.username || 'A')[0].toUpperCase()}</div>
            )}
            <div>
              <p className="font-bold text-gray-900">{adminInfo.displayName || adminInfo.username}</p>
              <p className="text-sm text-gray-500">@{adminInfo.username} · {adminInfo.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-red-50 border-red-100">
          <h3 className="font-bold text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            Danger Zone
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Irreversible actions that affect the entire platform.</p>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition min-h-[48px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              Reset All Verification
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-bold text-center">This will remove verification from all users. Continue?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  onClick={resetVerification}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition min-h-[48px]"
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset All'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
