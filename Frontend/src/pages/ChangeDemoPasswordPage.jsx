import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ChangeDemoPasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      if (api.isMockMode()) {
        await api.changeDemoPassword(password);
      } else {
        await api.changePassword(currentPassword, password);
      }
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to change the demo password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <section className="w-full max-w-lg space-y-5 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-lime-100 p-3 text-lime-900"><KeyRound className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-lime-800">{api.isMockMode() ? 'Development demo account' : 'Account security'}</p>
            <h1 className="text-2xl font-black text-gray-900">Change your temporary password</h1>
          </div>
        </div>
        <p className="text-sm text-gray-600">{api.isMockMode()
          ? "Choose a new password with at least 12 characters to continue. This change is stored only in this browser's demo account data."
          : 'Enter your temporary password and choose a new password with at least 12 characters to continue.'}</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!api.isMockMode() && (
            <label className="block text-sm font-semibold text-gray-700">
              Current temporary password
              <input required autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5" />
            </label>
          )}
          <label className="block text-sm font-semibold text-gray-700">
            New password
            <input required minLength={12} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Confirm new password
            <input required minLength={12} autoComplete="new-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5" />
          </label>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#a3e635] px-4 py-3 text-sm font-bold text-[#142008] disabled:opacity-50">
            {saving ? 'Updating password...' : 'Change password and continue'}
          </button>
        </form>
      </section>
    </div>
  );
}
