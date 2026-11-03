import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, KeyRound, Server, Shield } from 'lucide-react';
import { api } from '../services/api';
import { UnavailableNotice } from '../components/ApiState';

const NOTIFICATIONS_KEY = 'meditek_demo_notifications';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(() => localStorage.getItem(NOTIFICATIONS_KEY) !== 'false');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!api.isMockMode()) {
    return <UnavailableNotice module="Settings" detail="The backend does not expose a settings or role-administration endpoint. This screen does not edit server, database, authentication, or access-control settings." />;
  }

  const saveNotifications = (event) => {
    const enabled = event.target.checked;
    setError('');
    setMessage('');
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, String(enabled));
      setNotifications(enabled);
      setMessage('Local demo notification preference saved in this browser.');
    } catch (storageError) {
      setError(`Unable to save this browser preference: ${api.getErrorMessage(storageError)}`);
    }
  };
  const roles = [
    ['SUPER_ADMIN', 'Hospital-wide demo dashboards and account management'],
    ['DOCTOR', 'Assigned appointments and relevant clinical worklists'],
    ['STAFF', 'Patient registration, admissions, and operational modules'],
    ['PATIENT', 'Own profile, appointment history, and personal records'],
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><h1 className="text-2xl font-black text-gray-900">Application Settings</h1><p className="text-sm text-gray-500">Local demo preferences and integration status</p></header>
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Bell className="h-6 w-6 text-lime-800" /><div><h2 className="font-bold text-gray-900">Browser preference</h2><p className="text-xs text-gray-500">Applies only to this browser's demo display</p></div></div>
          <label className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 text-sm"><span>Show in-app notification indicators</span><input type="checkbox" checked={notifications} onChange={saveNotifications} className="h-4 w-4 accent-lime-600" /></label>
          <Link to="/change-password" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><KeyRound className="h-4 w-4" />Change demo password</Link>
        </section>
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Server className="h-6 w-6 text-indigo-700" /><div><h2 className="font-bold text-gray-900">API connection</h2><p className="text-xs text-gray-500">Active frontend data mode</p></div></div>
          <dl className="space-y-3 rounded-2xl bg-gray-50 p-4 text-sm"><div><dt className="text-xs text-gray-500">Mode</dt><dd className="font-semibold text-gray-900">Development mocks enabled</dd></div><div><dt className="text-xs text-gray-500">Configured live API base URL</dt><dd className="break-all font-mono text-xs text-gray-800">{api.getApiBaseUrl()}</dd></div><div><dt className="text-xs text-gray-500">Demo data behavior</dt><dd className="text-gray-700">Data is held in the browser or session and is not sent to the backend.</dd></div></dl>
        </section>
      </div>
      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><Shield className="h-6 w-6 text-amber-700" /><div><h2 className="font-bold text-gray-900">Role navigation (demo only)</h2><p className="text-xs text-gray-500">Frontend route/menu restrictions are not backend authorization.</p></div></div>
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100">{roles.map(([role, description]) => <div key={role} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-bold text-gray-900">{role}</span><span className="text-sm text-gray-600">{description}</span></div>)}</div>
        <p className="text-xs text-amber-900">Do not use demo role restrictions or demo data as a real security control or for production patient information. Server-side authorization and persistence remain backend dependencies.</p>
      </section>
    </div>
  );
}
