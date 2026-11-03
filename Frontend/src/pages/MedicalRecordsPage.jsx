import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

export default function MedicalRecordsPage() {
  const role = api.getCurrentRole();
  const currentUser = api.getCurrentUser();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', appointmentId: '', admissionId: '', content: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recordList, patientList, appointmentList] = await Promise.all([
        api.getMedicalRecords(),
        api.getPatients(),
        api.getAppointments(),
      ]);
      setRecords(recordList);
      setPatients(patientList);
      setAppointments(appointmentList);
      setForm((current) => ({ ...current, patientId: current.patientId || patientList[0]?.patientId || '' }));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load medical records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => !query || (
      `${record.patientId || ''} ${record.patientName || ''} ${record.authorName || ''} ${record.content || record.summary || ''}`
        .toLowerCase()
        .includes(query)
    ));
  }, [records, search]);

  const availableAppointments = appointments.filter((appointment) => {
    const patient = patients.find((item) => item.personId === appointment.patientPersonId);
    return patient?.patientId === form.patientId
      && appointment.status !== 'CANCELLED'
      && (role !== 'DOCTOR' || appointment.doctorPersonId === currentUser?.personId);
  });

  const createRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createMedicalRecord({
        patientId: form.patientId,
        appointmentId: form.appointmentId || null,
        admissionId: form.admissionId.trim() || null,
        content: form.content.trim(),
      });
      setRecords((current) => [created, ...current]);
      setSuccess(`Medical record ${created.recordId} was added. Records are preserved as immutable entries.`);
      setForm((current) => ({ ...current, content: '', appointmentId: '', admissionId: '' }));
      setShowForm(false);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to create medical record.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePatientChange = (patientId) => {
    setForm((current) => ({ ...current, patientId, appointmentId: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Medical Records</h1>
          <p className="text-sm text-gray-500">Patient-linked clinical notes with author and encounter history.</p>
        </div>
        {(role === 'DOCTOR' || role === 'STAFF') && <button type="button" onClick={() => setShowForm(true)} disabled={!patients.length} className="inline-flex items-center gap-2 rounded-2xl bg-[#a3e635] px-5 py-2.5 text-sm font-bold text-[#142008] shadow-md disabled:opacity-50"><Plus className="h-4 w-4" />Add record</button>}
      </div>
      {api.isMockMode() && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Development demo notes only. They are in-memory and reset on reload; never enter real patient information.</p>}
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {loading && <LoadingState label="Loading medical records..." />}

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <label className="mb-4 block max-w-md text-xs font-semibold text-gray-600"><span className="mb-1 flex items-center gap-2"><Search className="h-4 w-4" />Search records</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient, author, or note text" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        {visibleRecords.length === 0 && !loading ? <EmptyState>No medical records match this search.</EmptyState> : (
          <div className="space-y-3">
            {visibleRecords.map((record) => (
              <article key={record.recordId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3"><FileText className="mt-1 h-5 w-5 shrink-0 text-lime-800" /><div>
                    <h2 className="font-bold text-gray-900">{record.patientName} <span className="font-mono text-xs text-gray-500">{record.patientId}</span></h2>
                    <p className="text-xs text-gray-500">{record.recordId} · {record.authorName || record.provider || 'Care team'} · {new Date(record.createdAt || record.recordDate).toLocaleString()}</p>
                  </div></div>
                  <div className="text-right text-xs text-gray-500">{record.appointmentId && <p>Appointment {record.appointmentId}</p>}{record.admissionId && <p>Admission {record.admissionId}</p>}</div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{record.content || record.summary || ''}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={createRecord} className="my-6 w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Add an immutable clinical note</h2>
            <label className="block text-sm font-semibold">Registered patient
              <select required value={form.patientId} onChange={(event) => handlePatientChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} ({patient.patientId})</option>)}</select>
            </label>
            {role === 'DOCTOR' && <label className="block text-sm font-semibold">Your appointment
              <select required value={form.appointmentId} onChange={(event) => setForm((current) => ({ ...current, appointmentId: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select your appointment</option>{availableAppointments.map((appointment) => <option key={appointment.appointmentId} value={appointment.appointmentId}>{appointment.appointmentId} · {new Date(appointment.appointmentDate).toLocaleString()}</option>)}</select>
            </label>}
            {role === 'STAFF' && <label className="block text-sm font-semibold">Appointment ID (optional)
              <select value={form.appointmentId} onChange={(event) => setForm({ ...form, appointmentId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">No appointment link</option>{availableAppointments.map((appointment) => <option key={appointment.appointmentId} value={appointment.appointmentId}>{appointment.appointmentId} · {new Date(appointment.appointmentDate).toLocaleString()}</option>)}</select>
            </label>}
            {role === 'STAFF' && <label className="block text-sm font-semibold">Admission ID (optional)
              <input maxLength={64} value={form.admissionId} onChange={(event) => setForm({ ...form, admissionId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" />
            </label>}
            <label className="block text-sm font-semibold">Clinical note
              <textarea required maxLength={10000} rows={7} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" />
            </label>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <p className="text-xs text-gray-500">Entries cannot be edited or deleted after creation. Corrections should be added as a new note.</p>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save clinical note'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
