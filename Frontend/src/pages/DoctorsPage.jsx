import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Stethoscope, Phone, Mail, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const getDoctorInitials = (name) => {
  if (!name || typeof name !== 'string') return 'D';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || 'D').toUpperCase();
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', phoneNumber: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const currentUser = api.getCurrentUser();
  const isDoctor = api.getCurrentRole() === 'DOCTOR';

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rawItems = await api.getDoctors();
      const items = Array.isArray(rawItems) ? rawItems : [];
      setDoctors(items);
      if (isDoctor) {
        const ownProfile = items.find((item) => item?.personId === currentUser?.personId);
        if (ownProfile) setProfile({
          name: ownProfile.name || '',
          email: ownProfile.email || '',
          phoneNumber: ownProfile.phoneNumber || '',
        });
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load doctors.'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.personId, isDoctor]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const filtered = (Array.isArray(doctors) ? doctors : []).filter((d) =>
    Boolean(d) && [d.name, d.specialization, d.departmentName].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );
  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');
    try {
      const updated = await api.updateOwnDoctorProfile(profile);
      setDoctors((current) => current.map((doctor) => doctor.personId === updated.personId ? updated : doctor));
      setProfileMessage('Your demo profile was updated in this browser.');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update your profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Specialist Medical Officers & Doctors</h2>
          <p className="text-sm text-gray-500">Board-certified clinical consultants, department affiliations, and licensing credentials</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doctors, specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadDoctors} />}
      {profileMessage && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{profileMessage}</p>}
      {isDoctor && api.isMockMode() && (
        <form onSubmit={saveProfile} className="grid gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-3">
          <label className="text-xs font-semibold text-gray-700">Name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-semibold text-gray-700">Email<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-semibold text-gray-700">Phone<input required type="tel" value={profile.phoneNumber} onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
          <div className="sm:col-span-3"><button disabled={savingProfile} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingProfile ? 'Saving…' : 'Update my profile'}</button></div>
        </form>
      )}
      {isDoctor && !api.isMockMode() && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The current live API does not expose a doctor profile update operation.</p>}
      {loading && <LoadingState label="Loading doctors..." />}
      {!loading && !error && filtered.length === 0 && <EmptyState>{doctors.length ? 'No doctors match your search.' : 'No doctor profiles are available.'}</EmptyState>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((doc) => {
          if (!doc) return null;
          const key = doc.doctorId || doc.personId || doc.id || Math.random();
          return (
            <div
              key={key}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {getDoctorInitials(doc.name)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{doc.name || 'Specialist Officer'}</h4>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-800">
                      <Stethoscope className="w-3 h-3 text-lime-700" />
                      {doc.specialization || 'Clinical Specialist'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Doctor ID:</span>
                    <span className="font-mono font-bold text-gray-900">{doc.doctorId || doc.personId || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">License:</span>
                    <span className="font-medium text-gray-800">{doc.licenseNumber || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Department:</span>
                    <span className="font-semibold text-lime-800">{doc.departmentName || 'General'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{doc.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{doc.phoneNumber || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-semibold">
                  {doc.isActive == null ? 'Directory profile' : doc.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500">Profile: {doc.personId || '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
