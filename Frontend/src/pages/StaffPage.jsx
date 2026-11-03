import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Search } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

export default function StaffPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingId, setSavingId] = useState('');
  const isAdmin = api.getCurrentRole() === 'ADMIN';

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await api.getStaff();
      setStaffList(Array.isArray(raw) ? raw : []);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load staff directory.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filtered = (Array.isArray(staffList) ? staffList : []).filter((s) => {
    if (!s) return false;
    const matchSearch = [s.name, s.email, s.departmentName || s.department, s.role, s.staffId]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
    const matchFilter = roleFilter === 'ALL' || (s.subtype || s.role) === roleFilter;
    return matchSearch && matchFilter;
  });
  const roleFilters = api.isMockMode()
    ? ['ALL', 'Nurse', 'MedicalStaff']
    : ['ALL', ...new Set(staffList.map((staff) => staff.role).filter(Boolean))];

  const toggleStaffStatus = async (staff) => {
    const active = staff.isActive === false;
    const verb = active ? 'activate' : 'deactivate';
    if (!window.confirm(`${verb[0].toUpperCase()}${verb.slice(1)} ${staff.name}'s account?`)) return;
    setSavingId(staff.staffId);
    setError('');
    setSuccess('');
    try {
      const updated = await api.setStaffActive(staff.staffId, active);
      setStaffList((current) => current.map((item) => item.staffId === updated.staffId ? updated : item));
      setSuccess(`${updated.name}'s account was ${active ? 'activated' : 'deactivated'}.`);
      await loadStaff();
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update staff account status.'));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nursing & Clinical Support Staff</h2>
          <p className="text-sm text-gray-500">Personnel allocations, shift schedules, and department deployment</p>
        </div>
        <div className="flex gap-2">
          {roleFilters.map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                roleFilter === tab ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'ALL' ? 'All Staff' : tab === 'MedicalStaff' ? 'Clinical Staff' : tab === 'Nurse' ? 'Nurses' : tab}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadStaff} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {loading && <LoadingState label="Loading staff directory..." />}
      {!loading && !error && filtered.length === 0 && <EmptyState>No staff match this search or filter.</EmptyState>}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Staff Member</th>
                <th className="pb-3">Business ID</th>
                <th className="pb-3">Clinical Role</th>
                <th className="pb-3">Assigned Department</th>
                <th className="pb-3">Shift</th>
                <th className="pb-3 pr-2 text-right">Status{!api.isMockMode() && isAdmin ? ' / Management' : ''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {!loading && filtered.map((s) => (
                <tr key={s.staffId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-lime-100 text-lime-800 font-bold flex items-center justify-center text-xs">
                        {(s.name ? s.name.trim()[0] : 'S') || 'S'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-xs font-bold text-gray-700">{s.staffId}</td>
                  <td className="py-3.5 font-medium text-gray-800">{s.role}</td>
                  <td className="py-3.5 text-xs font-semibold text-lime-800">{s.departmentName || s.department || 'Not assigned'}</td>
                  <td className="py-3.5 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {s.shift || (api.isMockMode() ? 'Not assigned' : 'Not tracked')}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.isActive === false ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {s.isActive === false ? 'Inactive' : api.isMockMode() ? 'On-Duty' : 'Active'}
                    </span>
                    {!api.isMockMode() && isAdmin && (
                      <button
                        type="button"
                        disabled={savingId === s.staffId}
                        onClick={() => toggleStaffStatus(s)}
                        className={`ml-2 rounded-lg border px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${s.isActive === false ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}`}
                      >
                        {savingId === s.staffId ? 'Saving…' : s.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
