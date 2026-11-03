import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, User, Search, Plus, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const appointmentKey = (appointment) => appointment?.appointmentId || appointment?.id || '—';
const appointmentDate = (appointment) => appointment?.appointmentDate || appointment?.date;
const formatAppointmentDate = (dateStr) => {
  if (!dateStr) return 'Date not provided';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Date not provided' : d.toLocaleString();
  } catch {
    return 'Date not provided';
  }
};
const localDateTimeMinimum = () => new Date(
  Date.now() - new Date().getTimezoneOffset() * 60000
).toISOString().slice(0, 16);

export default function AppointmentsPage() {
  const role = api.getCurrentRole();
  const currentUser = api.getCurrentUser();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientPersonId: '',
    doctorPersonId: '',
    appointmentDate: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        api.getAppointments(),
        role === 'PATIENT' ? Promise.resolve([]) : api.getPatients(),
        api.getDoctors(),
      ];
      const results = await Promise.allSettled(promises);
      const [appointmentsResult, patientsResult, doctorsResult] = results;
      if (appointmentsResult.status === 'fulfilled') {
        const rawItems = appointmentsResult.value;
        const items = Array.isArray(rawItems) ? rawItems : [];
        setAppointments(role === 'DOCTOR'
          ? items.filter((item) => item?.doctorPersonId === currentUser?.personId)
          : items);
      } else {
        setAppointments([]);
      }
      const patientsData = patientsResult.status === 'fulfilled' && Array.isArray(patientsResult.value)
        ? patientsResult.value
        : [];
      const doctorsData = doctorsResult.status === 'fulfilled' && Array.isArray(doctorsResult.value)
        ? doctorsResult.value
        : [];
      setPatients(patientsData);
      setDoctors(doctorsData);
      setFormData((current) => ({
        ...current,
        patientPersonId: current.patientPersonId || patientsData[0]?.personId || '',
        doctorPersonId: current.doctorPersonId || doctorsData[0]?.personId || '',
      }));
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        setError(failed.map((result) => api.getErrorMessage(result.reason, 'Unable to load appointment data.')).join(' '));
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.personId, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createAppointment({
        ...formData,
        appointmentDate: new Date(formData.appointmentDate).toISOString(),
      });
      setAppointments((current) => [created, ...current]);
      setShowModal(false);
      setSuccess(`Appointment ${appointmentKey(created)} scheduled.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to schedule appointment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (appointment, status) => {
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateAppointmentStatus(appointmentKey(appointment), status);
      setAppointments((current) => current.map((item) => (
        appointmentKey(item) === appointmentKey(appointment) ? updated : item
      )));
      setSuccess(`Appointment ${appointmentKey(updated)} marked ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update appointment status.'));
    }
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(appointments) ? appointments : [];
    return list.filter((appointment) => {
      if (!appointment) return false;
      const text = [
        appointment.patientName,
        appointment.doctorName,
        appointment.notes,
        appointment.type,
        appointmentKey(appointment),
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(search.toLowerCase()) && (filter === 'ALL' || appointment.status === filter);
    });
  }, [appointments, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Appointments Management</h2>
          <p className="text-sm text-gray-500">{role === 'DOCTOR'
            ? 'Your assigned appointments, relevant patient details, and appointment history'
            : 'Schedule and track patient consultations using active patient and doctor records'}</p>
        </div>
        {role === 'ADMIN' && <button
          onClick={() => setShowModal(true)}
          disabled={!patients.length || !doctors.length}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Appointment</span>
        </button>}
      </div>

      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient, doctor, or note..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl border border-gray-200 text-xs font-semibold">
          {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
            <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-xl transition-all ${filter === status ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState label="Loading appointments..." /> : filtered.length === 0 ? (
        <EmptyState>{appointments.length ? 'No appointments match the current search or status filter.' : 'No appointments have been scheduled.'}</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((appointment) => {
            if (!appointment) return null;
            const date = appointmentDate(appointment);
            const key = appointmentKey(appointment);
            return (
              <article key={key} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-lime-50 text-lime-800 border border-lime-200">{key}</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{appointment.status || 'SCHEDULED'}</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">{appointment.notes || appointment.type || 'Consultation'}</h4>
                  <div className="space-y-1 text-xs text-gray-600 mt-2">
                    <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" />Patient: <strong className="text-gray-800">{appointment.patientName || appointment.patientPersonId || '—'}</strong></p>
                    <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-lime-600" />Doctor: <strong className="text-gray-800">{appointment.doctorName || appointment.doctorPersonId || '—'}</strong></p>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatAppointmentDate(date)}</span>
                  {role === 'DOCTOR' && appointment.doctorPersonId === currentUser?.personId && appointment.status === 'SCHEDULED' && (
                    <span className="flex gap-2">
                      <button onClick={() => handleStatus(appointment, 'COMPLETED')} className="text-emerald-700 font-semibold hover:underline" title="Mark completed"><Check className="inline h-4 w-4" /></button>
                      {api.isMockMode() && <button onClick={() => handleStatus(appointment, 'CANCELLED')} className="text-rose-700 font-semibold hover:underline" title="Cancel appointment"><X className="inline h-4 w-4" /></button>}
                    </span>
                  )}
                  {!date && <Clock className="h-3.5 w-3.5" />}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Book Clinical Consultation</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-xs font-semibold text-gray-700">
                Patient
                <select required value={formData.patientPersonId} onChange={(event) => setFormData({ ...formData, patientPersonId: event.target.value })} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm">
                  {patients.map((patient) => <option key={patient.personId} value={patient.personId}>{patient.name} ({patient.patientId})</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Doctor
                <select required value={formData.doctorPersonId} onChange={(event) => setFormData({ ...formData, doctorPersonId: event.target.value })} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm">
                  {doctors.map((doctor) => <option key={doctor.personId} value={doctor.personId}>{doctor.name} — {doctor.specialization}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Appointment date and time
                <input required type="datetime-local" min={localDateTimeMinimum()} value={formData.appointmentDate} onChange={(event) => setFormData({ ...formData, appointmentDate: event.target.value })} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Clinical notes
                <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows={2} className="mt-1 w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm" />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs disabled:opacity-50">{saving ? 'Scheduling...' : 'Confirm Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
