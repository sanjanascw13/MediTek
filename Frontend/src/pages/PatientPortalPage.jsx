import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { CalendarPlus, UserRoundPen } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const sections = {
  appointments: { title: 'My appointments', key: 'appointments' },
  prescriptions: { title: 'My prescriptions', key: 'prescriptions' },
  bills: { title: 'My bills', key: 'bills' },
  records: { title: 'My health records', key: 'records' },
};
const localDateTimeMinimum = () => new Date(
  Date.now() - new Date().getTimezoneOffset() * 60000
).toISOString().slice(0, 16);

function DataTable({ section, items, onPayBill }) {
  if (section === 'appointments') {
    return items.map((item) => (
      <div key={item.appointmentId || item.id} className="rounded-2xl bg-gray-50 p-4">
        <p className="font-semibold text-gray-900">{item.notes || item.type || 'Consultation'}</p>
        <p className="mt-1 text-sm text-gray-600">{item.doctorName} · {item.appointmentDate || item.date}</p>
        <p className="mt-1 text-xs font-semibold text-lime-800">{item.status}</p>
      </div>
    ));
  }
  if (section === 'prescriptions') {
    return items.map((item) => (
      <div key={item.prescriptionId} className="rounded-2xl bg-gray-50 p-4">
        <p className="font-semibold text-gray-900">{item.medicine}</p>
        <p className="mt-1 text-sm text-gray-600">{item.dosage} · {item.frequency}</p>
        <p className="mt-1 text-xs text-gray-500">Prescribed by {item.doctorName} · {item.issuedAt}</p>
      </div>
    ));
  }
  if (section === 'bills') {
    return items.map((item) => {
      const balance = Number(item.balanceDue ?? item.amountTotal);
      return (
        <div key={item.billId} className="flex flex-wrap justify-between items-center gap-3 rounded-2xl bg-gray-50 p-4">
          <div>
            <p className="font-semibold text-gray-900">{item.billId} · ${Number(item.amountTotal).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Issued {item.issuedAt}{item.paidAt ? ` · Paid ${item.paidAt}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {item.status} · Due ${balance.toFixed(2)}
            </span>
            {balance > 0 && onPayBill && (
              <button
                type="button"
                onClick={() => onPayBill(item)}
                className="px-3.5 py-1.5 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 transition-all shadow-sm"
              >
                Pay Bill
              </button>
            )}
          </div>
        </div>
      );
    });
  }
  return items.map((item) => (
    <div key={item.recordId} className="rounded-2xl bg-gray-50 p-4">
      <p className="font-semibold text-gray-900">{item.title || `Medical record ${item.recordId}`}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.summary || item.content}</p>
      <p className="mt-1 text-xs text-gray-500">{item.provider || item.authorName} · {item.recordDate || item.createdAt}</p>
    </div>
  ));
}

export default function PatientPortalPage({ section = 'overview' }) {
  const [portal, setPortal] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ doctorPersonId: '', appointmentDate: '', notes: '' });
  const [profile, setProfile] = useState({ phoneNumber: '', address: '', emergencyContact: '' });
  const [payingBill, setPayingBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [paySaving, setPaySaving] = useState(false);

  const startPayBill = (bill) => {
    setPayingBill(bill);
    setPayAmount(String(Number(bill.balanceDue ?? bill.amountTotal).toFixed(2)));
    setError('');
  };

  const handlePayBill = async (event) => {
    event.preventDefault();
    if (!payingBill) return;
    setPaySaving(true);
    setError('');
    setSuccess('');
    try {
      const paymentRequestId = globalThis.crypto?.randomUUID?.()
        || `pay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await api.recordBillPayment(payingBill.billId, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentRequestId,
      });
      setSuccess(`Payment of ${Number(payAmount).toFixed(2)} recorded successfully for invoice ${payingBill.billId}.`);
      setPayingBill(null);
      await loadPortal();
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to process bill payment.'));
    } finally {
      setPaySaving(false);
    }
  };

  const loadPortal = () => api.getPatientPortalData()
    .then((data) => {
      setPortal(data);
      setProfile({
        phoneNumber: data.patient.phoneNumber || '',
        address: data.patient.address || '',
        emergencyContact: data.patient.emergencyContact || '',
      });
    })
    .catch((requestError) => setError(api.getErrorMessage(requestError, 'Unable to load your patient portal.')));

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError('');
    try {
      const items = await api.getDoctors();
      const activeDoctors = items.filter((doctor) => doctor.isActive !== false);
      setDoctors(activeDoctors);
      setForm((current) => ({
        ...current,
        doctorPersonId: activeDoctors.some((doctor) => doctor.personId === current.doctorPersonId)
          ? current.doctorPersonId
          : activeDoctors[0]?.personId || '',
      }));
    } catch (requestError) {
      setDoctors([]);
      setDoctorsError(api.getErrorMessage(requestError, 'Unable to load the doctor directory.'));
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortal();
    loadDoctors();
  }, [loadDoctors]);

  const bookAppointment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createAppointment({
        doctorPersonId: form.doctorPersonId,
        appointmentDate: new Date(form.appointmentDate).toISOString(),
        notes: form.notes.trim(),
      });
      setShowBooking(false);
      setForm((current) => ({ ...current, appointmentDate: '', notes: '' }));
      setSuccess(`Appointment ${created.appointmentId || created.id} was submitted with status ${created.status}. It will appear in your appointment history and the selected Doctor's worklist.`);
      await loadPortal();
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to book your appointment.'));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    setSuccess('');
    try {
      await api.updatePatientProfile(profile);
      setSuccess('Your demo profile was updated in this browser.');
      await loadPortal();
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update your profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-gray-900">Patient portal</h1>
        <ErrorState message={error} />
        {!api.isMockMode() && <p className="text-sm text-gray-500">Your account is limited to patient-scoped live records. Profile editing is not supported by the current API; appointment booking is available when an active Doctor is listed.</p>}
        <button type="button" onClick={() => { setError(''); loadPortal(); loadDoctors(); }} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    );
  }
  if (!portal) return <LoadingState label="Loading your personal health information..." />;

  const patient = portal.patient;
  const title = sections[section]?.title;
  const visibleSections = title ? [section] : Object.keys(sections);
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Patient portal</p>
        <h1 className="mt-1 text-3xl font-black text-gray-900">Welcome, {patient.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Your appointments, prescriptions, bills, and health records.</p>
      </div>
      {api.isMockMode() && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Development demo data only. Frontend role navigation is not an authorization or security control.
        </p>
      )}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {api.isMockMode() && (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><UserRoundPen className="h-5 w-5 text-lime-800" /><h2 className="text-lg font-bold text-gray-900">My profile</h2></div>
          <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-3">
            {[
              ['phoneNumber', 'Phone number', 'tel'],
              ['address', 'Address', 'text'],
              ['emergencyContact', 'Emergency contact', 'tel'],
            ].map(([key, label, type]) => (
              <label key={key} className="text-xs font-semibold text-gray-700">{label}
                <input required type={type} value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" />
              </label>
            ))}
            <div className="sm:col-span-3"><button disabled={savingProfile} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingProfile ? 'Saving…' : 'Save my profile'}</button></div>
          </form>
          {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={handlePayBill} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Pay Hospital Bill</h2>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Invoice ID:</span>
                <span>{payingBill.billId}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Amount:</span>
                <span>${Number(payingBill.amountTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lime-900 font-bold">
                <span>Outstanding Balance:</span>
                <span>${Number(payingBill.balanceDue ?? payingBill.amountTotal).toFixed(2)}</span>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700">Payment Amount ($)
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                max={Number(payingBill.balanceDue ?? payingBill.amountTotal)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">Payment Method
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="BANK_TRANSFER">Bank Transfer / Online Portal</option>
                <option value="CASH">Cash Deposit</option>
                <option value="OTHER">Other / Card</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                disabled={paySaving || !payAmount || Number(payAmount) <= 0}
                className="rounded-xl bg-[#a3e635] px-5 py-2 text-sm font-bold text-gray-900 hover:bg-[#8ddb16] disabled:opacity-50"
              >
                {paySaving ? 'Processing…' : `Confirm Payment (${Number(payAmount || 0).toFixed(2)})`}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
      )}
      {visibleSections.map((key) => (
        <section key={key} className="space-y-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">{sections[key].title}</h2>
            {key === 'appointments' && <button type="button" onClick={() => { setError(''); setShowBooking(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold text-gray-900"><CalendarPlus className="h-4 w-4" />Book appointment</button>}
            {!title && <Link className="text-sm font-semibold text-lime-800 hover:underline" to={`/patient/${key}`}>View all</Link>}
          </div>
          {portal[sections[key].key].length === 0
            ? <EmptyState>No {key} are available.</EmptyState>
            : <div className="space-y-3"><DataTable section={key} items={title ? portal[sections[key].key] : portal[sections[key].key].slice(0, 3)} onPayBill={startPayBill} /></div>}
        </section>
      ))}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={bookAppointment} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Book an appointment</h2>
            {doctorsError && <ErrorState message={doctorsError} onRetry={loadDoctors} />}
            {!doctorsLoading && !doctorsError && doctors.length === 0 && <EmptyState>No active doctors are available for booking.</EmptyState>}
            <label className="block text-sm font-semibold text-gray-700">Active doctor
              <select required disabled={doctorsLoading || Boolean(doctorsError) || !doctors.length} value={form.doctorPersonId} onChange={(event) => setForm({ ...form, doctorPersonId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal disabled:bg-gray-100">
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => <option key={doctor.personId} value={doctor.personId}>{doctor.name} · {doctor.specialization}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">Date and time
              <input required type="datetime-local" min={localDateTimeMinimum()} value={form.appointmentDate} onChange={(event) => setForm({ ...form, appointmentDate: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-gray-700">Reason for visit
              <textarea required maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
            </label>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowBooking(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button disabled={saving || doctorsLoading || !doctors.length} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold text-gray-900 disabled:opacity-50">{saving ? 'Booking…' : 'Confirm booking'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
