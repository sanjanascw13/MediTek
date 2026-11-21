import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle, Plus, Scissors, Search } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const localDateTimeMinimum = () => new Date(
  Date.now() - new Date().getTimezoneOffset() * 60000
).toISOString().slice(0, 16);

const emptyForm = {
  theaterNumber: '',
  patientId: '',
  doctorId: '',
  surgeryDate: '',
  surgeryType: '',
  durationMinutes: '60',
  notes: '',
};

export default function SurgeriesPage() {
  const [surgeries, setSurgeries] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const isDemo = api.isMockMode();
  const role = api.getCurrentRole();
  const canSchedule = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role);
  const canUpdate = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'DOCTOR'].includes(role);

  const loadData = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      if (isDemo) {
        const [theaterList, patientList] = await Promise.all([
          api.getSurgeries(),
          api.getPatients(),
        ]);
        setTheaters(theaterList);
        setPatients(patientList);
        setForm((current) => ({
          ...current,
          theaterNumber: current.theaterNumber
            || theaterList.find((item) => item.status === 'AVAILABLE')?.theaterNumber || '',
          patientId: current.patientId || patientList[0]?.personId || '',
        }));
      } else {
        const surgeryFilters = query.trim() ? { search: query.trim() } : {};
        const surgeryList = await api.getSurgeries(surgeryFilters);
        setSurgeries(surgeryList);
        if (role === 'PATIENT') {
          setPatients([await api.getCurrentPatient()].filter(Boolean));
          setTheaters([]);
          setDoctors([]);
        } else {
          const [theaterList, patientList, doctorList] = await Promise.all([
            api.getOperatingTheaters(),
            canSchedule ? api.getPatients() : Promise.resolve([]),
            ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'].includes(role) ? api.getDoctors() : Promise.resolve([]),
          ]);
          setTheaters(theaterList);
          setPatients(patientList);
          setDoctors(doctorList);
          const currentDoctor = doctorList.find((doctor) => (
            doctor.personId === api.getCurrentUser()?.personId
          ));
          setForm((current) => ({
            ...current,
            theaterNumber: current.theaterNumber || theaterList[0]?.theaterNumber || '',
            patientId: current.patientId || patientList[0]?.patientId || '',
            doctorId: current.doctorId || currentDoctor?.doctorId || doctorList[0]?.doctorId || '',
          }));
        }
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load surgery schedules.'));
    } finally {
      setLoading(false);
    }
  }, [canSchedule, isDemo, role]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(search), isDemo ? 0 : 250);
    return () => clearTimeout(timer);
  }, [loadData, search, isDemo]);

  const saveSurgery = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (isDemo) {
        const updated = await api.scheduleSurgery({
          theaterNumber: form.theaterNumber,
          patientPersonId: form.patientId,
          procedure: form.surgeryType,
          surgeryDate: form.surgeryDate,
        });
        setTheaters((current) => current.map((theater) => (
          theater.theaterNumber === updated.theaterNumber ? updated : theater
        )));
        setSuccess(`Demo procedure scheduled in ${updated.theaterNumber}; no real theater reservation was made.`);
      } else {
        const created = await api.scheduleSurgery(form);
        setSurgeries((current) => [created, ...current]);
        setSuccess(`Surgery ${created.surgeryId} scheduled.`);
      }
      setShowForm(false);
      setForm((current) => ({ ...emptyForm, theaterNumber: current.theaterNumber, doctorId: current.doctorId }));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to schedule surgery.'));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (surgery, status) => {
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateSurgeryStatus(surgery.surgeryId, status);
      setSurgeries((current) => current.map((item) => item.surgeryId === updated.surgeryId ? updated : item));
      setSuccess(`Surgery ${updated.surgeryId} marked ${updated.status.toLowerCase().replace('_', ' ')}.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update surgery status.'));
    }
  };

  const visibleTheaters = theaters.filter((theater) => (
    `${theater.theaterNumber} ${theater.department} ${theater.procedure}`
      .toLowerCase().includes(search.trim().toLowerCase())
  ));

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Operating Theaters & Surgical Schedules</h1>
          <p className="text-sm text-gray-500">{isDemo ? 'Demo theater schedules' : 'Role-scoped surgery schedule and history'}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input aria-label="Search surgeries" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedules" className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm sm:w-56" />
          </label>
          {canSchedule && <button onClick={() => setShowForm(true)} disabled={!patients.length || !theaters.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#a3e635] px-5 py-2.5 text-sm font-bold text-gray-900 disabled:opacity-50"><Plus className="h-4 w-4" />Schedule surgery</button>}
        </div>
      </header>
      {error && <ErrorState message={error} onRetry={() => loadData(search)} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {loading ? <LoadingState label="Loading surgery schedules..." /> : isDemo ? (
        visibleTheaters.length === 0 ? <EmptyState>No operating theaters match this search.</EmptyState> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleTheaters.map((theater) => (
              <article key={theater.theaterNumber} className="flex flex-col justify-between rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div>
                  <div className="flex items-center justify-between"><Scissors className="h-5 w-5 text-lime-800" /><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">{theater.status}</span></div>
                  <h2 className="mt-4 font-bold text-gray-900">{theater.theaterNumber}</h2>
                  <p className="mt-1 text-xs text-gray-500">{theater.department}</p>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
                  <p className="font-semibold text-gray-800">{patients.find((item) => item.personId === theater.currentPatientPersonId)?.name || 'No patient assigned'}</p>
                  <p className="text-gray-600">{theater.procedure || 'No procedure scheduled'}</p>
                  {theater.surgeryDate && <p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Calendar className="h-3.5 w-3.5" />{new Date(theater.surgeryDate).toLocaleString()}</p>}
                </div>
              </article>
            ))}
          </div>
        )
      ) : surgeries.length === 0 ? <EmptyState>No surgery records are available.</EmptyState> : (
        <div className="space-y-3">
          {surgeries.map((surgery) => (
            <article key={surgery.surgeryId} className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-lime-800">{surgery.surgeryId}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700">{surgery.status.replace('_', ' ')}</span>
                  <span className="text-xs font-semibold text-gray-500">{surgery.theaterNumber}</span>
                </div>
                <h2 className="font-bold text-gray-900">{surgery.surgeryType}</h2>
                <p className="text-sm text-gray-600">{surgery.patientName} · {surgery.doctorName}</p>
                <p className="text-xs text-gray-500">{new Date(surgery.scheduledAt).toLocaleString()} · {surgery.durationMinutes} minutes</p>
                {surgery.notes && <p className="text-sm text-gray-500">{surgery.notes}</p>}
              </div>
              {canUpdate && <div className="flex flex-wrap gap-2">
                {surgery.status === 'SCHEDULED' && <>
                  <button onClick={() => updateStatus(surgery, 'IN_PROGRESS')} className="rounded-xl bg-lime-100 px-3 py-2 text-xs font-bold text-lime-900">Start</button>
                  <button onClick={() => updateStatus(surgery, 'CANCELLED')} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Cancel</button>
                </>}
                {surgery.status === 'IN_PROGRESS' && <button onClick={() => updateStatus(surgery, 'COMPLETED')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900"><CheckCircle className="h-3.5 w-3.5" />Complete</button>}
              </div>}
            </article>
          ))}
        </div>
      )}
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={saveSurgery} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{isDemo ? 'Schedule demo procedure' : 'Schedule surgery'}</h2>
        <label className="block text-sm font-semibold">Operating theater<select required value={form.theaterNumber} onChange={(event) => setForm({ ...form, theaterNumber: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select theater</option>{theaters.map((item) => <option key={item.theaterNumber} value={item.theaterNumber}>{item.theaterNumber}{item.departmentName ? ` · ${item.departmentName}` : ''}</option>)}</select></label>
        <label className="block text-sm font-semibold">Patient<select required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={isDemo ? patient.personId : patient.patientId}>{patient.name} ({patient.patientId})</option>)}</select></label>
        {!isDemo && ['SUPER_ADMIN', 'ADMIN'].includes(role) && (
          <label className="block text-sm font-semibold">Responsible Operating Surgeon
            <select required value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal">
              <option value="">Select Doctor</option>
              {doctors.map((doctor) => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name} · {doctor.specialization || 'General'} ({doctor.doctorId})</option>)}
            </select>
          </label>
        )}
        {!isDemo && role === 'DOCTOR' && (
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-700">
            <span className="font-semibold text-gray-500">Lead Surgeon:</span> <strong className="text-gray-900">{doctors.find(d => d.doctorId === form.doctorId || d.personId === api.getCurrentUser()?.personId)?.name || 'Dr. ' + (api.getCurrentUser()?.fullName || 'Assigned to your profile')}</strong>
          </div>
        )}
        <label className="block text-sm font-semibold">Surgery type<input required maxLength={128} value={form.surgeryType} onChange={(event) => setForm({ ...form, surgeryType: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Date and time<input required type="datetime-local" min={localDateTimeMinimum()} value={form.surgeryDate} onChange={(event) => setForm({ ...form, surgeryDate: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        {!isDemo && <label className="block text-sm font-semibold">Estimated duration (minutes)<input required type="number" min="1" max="1440" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>}
        {!isDemo && <label className="block text-sm font-semibold">Notes<textarea maxLength={4000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" rows="3" /></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold">{saving ? 'Saving…' : isDemo ? 'Save demo schedule' : 'Schedule surgery'}</button></div>
      </form></div>}
    </div>
  );
}
