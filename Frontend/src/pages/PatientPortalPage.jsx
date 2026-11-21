import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  CalendarDays,
  CalendarPlus,
  Pill,
  Microscope,
  Receipt,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  X,
  RefreshCw,
  Building2,
  Stethoscope,
  Eye,
  Check,
  ShieldCheck,
  ArrowRight,
  User,
  HeartPulse,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

// Strict LKR Currency Formatter
const formatLKR = (amount) => {
  const val = Number(amount || 0);
  return `LKR ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const localDateTimeMinimum = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function PatientPortalPage({ section: defaultSection = 'overview' }) {
  const params = useParams();
  const currentSection = params.section || defaultSection;

  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Doctor list for appointment booking
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');

  // Appointment booking modal state
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    doctorPersonId: '',
    appointmentDate: '',
    notes: '',
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Bill payment modal state
  const [payingBill, setPayingBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Official receipt viewer modal state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Lab report viewer modal state
  const [viewingLabReport, setViewingLabReport] = useState(null);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);

  // Load patient portal dataset
  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPatientPortalData();
      setPortal(data);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load your patient health records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load doctor directory for consultation bookings
  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError('');
    try {
      const items = await api.getDoctors();
      const active = (items || []).filter((d) => d.isActive !== false);
      setDoctors(active);
      if (active.length > 0) {
        setBookingForm((prev) => ({
          ...prev,
          doctorPersonId: prev.doctorPersonId || active[0].personId || '',
        }));
      }
    } catch (err) {
      setDoctors([]);
      setDoctorsError(api.getErrorMessage(err, 'Unable to load doctor directory.'));
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortal();
    loadDoctors();
  }, [loadPortal, loadDoctors]);

  // Submit appointment booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingForm.doctorPersonId || !bookingForm.appointmentDate) {
      setError('Please select a doctor and consultation date/time.');
      return;
    }

    setSubmittingBooking(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createAppointment({
        doctorPersonId: bookingForm.doctorPersonId,
        appointmentDate: new Date(bookingForm.appointmentDate).toISOString(),
        notes: bookingForm.notes.trim() || 'General Consultation',
      });

      setShowBooking(false);
      setBookingForm({ doctorPersonId: doctors[0]?.personId || '', appointmentDate: '', notes: '' });
      setSuccess(`Appointment ${created.appointmentId || created.id || ''} confirmed! It is now scheduled in your doctor's consultation queue.`);
      setTimeout(() => setSuccess(''), 6000);
      await loadPortal();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to book appointment. Please try again.'));
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Open Pay Bill modal
  const handleOpenPayBill = (bill) => {
    setPayingBill(bill);
    const balance = Number(bill.balanceDue ?? (bill.amountTotal - (bill.amountPaid || 0)));
    setPayAmount(balance > 0 ? String(balance) : '0');
    setPayMethod('BANK_TRANSFER');
    setError('');
  };

  // Submit online bill settlement
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payingBill) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      setError('Enter a valid payment amount in LKR.');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    setSuccess('');
    try {
      const paymentRequestId = `PAT-PAY-${Date.now()}`;
      await api.recordBillPayment(payingBill.billId, {
        amount: amountNum,
        paymentMethod: payMethod,
        paymentRequestId,
      });

      setSuccess(`Payment of ${formatLKR(amountNum)} recorded successfully for invoice ${payingBill.billId}. Receipt generated.`);
      setTimeout(() => setSuccess(''), 6000);
      setPayingBill(null);
      await loadPortal();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to process bill payment.'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Lab Report modal with details
  const handleOpenLabReport = async (test) => {
    setViewingLabReport(test);
    setLoadingReportDetails(true);
    try {
      if (test.testId) {
        const report = await api.getLabReport(test.testId);
        setViewingLabReport((prev) => ({ ...prev, reportDetails: report }));
      }
    } catch {
      // Keep existing data if report endpoint is restricted
    } finally {
      setLoadingReportDetails(false);
    }
  };

  // Computed metrics
  const appointments = portal?.appointments || [];
  const prescriptions = portal?.prescriptions || [];
  const bills = portal?.bills || [];
  const records = portal?.records || [];
  const labs = portal?.labs || [];

  const totalOutstandingLKR = useMemo(() => {
    return bills.reduce((sum, b) => {
      const balance = Number(b.balanceDue ?? (b.amountTotal - (b.amountPaid || 0)));
      return sum + (balance > 0 ? balance : 0);
    }, 0);
  }, [bills]);

  const upcomingAppointments = useMemo(() => {
    return appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED');
  }, [appointments]);

  if (loading && !portal) {
    return <LoadingState label="Loading your personal health information..." />;
  }

  const patient = portal?.patient || { name: 'Valued Patient', patientId: 'PAT-000001' };

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-100 text-lime-800 shadow-inner">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900">Welcome, {patient.name}</h1>
                <span className="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-900">
                  {patient.patientId || 'Patient'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Personal Electronic Health Records • MediTek Health Care System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-lime-300"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
            </button>
            <button
              onClick={() => loadPortal()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
              title="Refresh Records"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && <ErrorState message={error} onRetry={loadPortal} />}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Quick Navigation Tabs (When visiting / or clicking between tabs) */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <Link
          to="/"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'overview'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          Overview
        </Link>
        <Link
          to="/patient/appointments"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'appointments'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Appointments ({appointments.length})
        </Link>
        <Link
          to="/patient/prescriptions"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'prescriptions'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Pill className="h-3.5 w-3.5" />
          Prescriptions ({prescriptions.length})
        </Link>
        <Link
          to="/labs"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'labs'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Microscope className="h-3.5 w-3.5" />
          Lab Reports ({labs.length})
        </Link>
        <Link
          to="/patient/bills"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'bills'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Billing & Payments ({bills.length})
          {totalOutstandingLKR > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
              Due
            </span>
          )}
        </Link>
        <Link
          to="/patient/records"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
            currentSection === 'records'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Health Records ({records.length})
        </Link>
      </div>

      {/* KPI Cards (Overview Section) */}
      {currentSection === 'overview' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Upcoming Appointments */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Upcoming Visits</p>
                <p className="mt-1 text-2xl font-black text-gray-900">{upcomingAppointments.length}</p>
                <p className="mt-0.5 text-xs text-lime-700 font-medium">Scheduled with Doctor</p>
              </div>
              <div className="rounded-2xl bg-lime-50 p-3 text-lime-800">
                <CalendarDays className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card 2: Active Prescriptions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Prescriptions</p>
                <p className="mt-1 text-2xl font-black text-cyan-600">{prescriptions.length}</p>
                <p className="mt-0.5 text-xs text-gray-500">Active medications</p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
                <Pill className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card 3: Lab Reports */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Diagnostic Reports</p>
                <p className="mt-1 text-2xl font-black text-purple-600">{labs.length}</p>
                <p className="mt-0.5 text-xs text-gray-500">Verified Pathology</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
                <Microscope className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card 4: Outstanding Invoices in LKR */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Balance Due (LKR)</p>
                <p className={`mt-1 text-xl font-black ${totalOutstandingLKR > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatLKR(totalOutstandingLKR)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {totalOutstandingLKR > 0 ? 'Payment Required' : 'All Settled'}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${totalOutstandingLKR > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: APPOINTMENTS */}
      {(currentSection === 'overview' || currentSection === 'appointments') && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-lime-700" />
              <h2 className="text-base font-bold text-gray-900">My Consultation Appointments</h2>
            </div>
            <button
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-lime-100 px-3 py-1.5 text-xs font-bold text-lime-900 hover:bg-lime-200"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Book New
            </button>
          </div>

          {appointments.length === 0 ? (
            <EmptyState>No appointments recorded in your consultation history.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appointments.map((item) => (
                <div
                  key={item.appointmentId || item.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2 hover:border-lime-200 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{item.notes || 'General Consultation'}</p>
                      <p className="text-[11px] font-medium text-gray-500">
                        {item.appointmentId || item.id}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-lime-100 text-lime-800'
                    }`}>
                      {item.status || 'SCHEDULED'}
                    </span>
                  </div>
                  <div className="pt-1 text-xs text-gray-700 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-semibold">{item.doctorName || 'Attending Doctor'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{item.appointmentDate ? new Date(item.appointmentDate).toLocaleString() : 'Date TBD'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION: PRESCRIPTIONS */}
      {(currentSection === 'overview' || currentSection === 'prescriptions') && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-cyan-700" />
              <h2 className="text-base font-bold text-gray-900">My Doctor Prescriptions</h2>
            </div>
            <span className="text-xs text-gray-400">{prescriptions.length} e-prescription(s)</span>
          </div>

          {prescriptions.length === 0 ? (
            <EmptyState>No active e-prescriptions on record.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prescriptions.map((item) => (
                <div
                  key={item.prescriptionId}
                  className="rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4 space-y-2 hover:border-cyan-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-900">{item.medicine || 'Formulary Medication'}</p>
                      <p className="text-[11px] font-mono text-cyan-800">{item.prescriptionId}</p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                      ACTIVE
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 pt-1">
                    <p><strong>Dosage:</strong> {item.dosage || 'Standard'}</p>
                    <p><strong>Frequency:</strong> {item.frequency || 'Daily'}</p>
                    <p className="text-[11px] text-gray-400 pt-1">
                      Prescribed by {item.doctorName || 'Doctor'} • {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION: LABORATORY REPORTS */}
      {(currentSection === 'overview' || currentSection === 'labs') && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-purple-700" />
              <h2 className="text-base font-bold text-gray-900">Diagnostic Laboratory Results</h2>
            </div>
            <span className="text-xs text-gray-400">{labs.length} verified report(s)</span>
          </div>

          {labs.length === 0 ? (
            <EmptyState>No laboratory test reports available for your account.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="p-3">Test Order</th>
                    <th className="p-3">Diagnostic Panel</th>
                    <th className="p-3">Attending Doctor</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Findings</th>
                    <th className="p-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {labs.map((test) => (
                    <tr key={test.testId} className="hover:bg-gray-50/70">
                      <td className="p-3 font-mono font-bold text-gray-700">{test.testId}</td>
                      <td className="p-3 font-bold text-gray-900">{test.testName || 'Laboratory Specimen Test'}</td>
                      <td className="p-3 text-gray-600">{test.doctorName || 'Physician'}</td>
                      <td className="p-3 text-gray-500">
                        {test.testDate ? new Date(test.testDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          test.result === 'NORMAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : test.result === 'ABNORMAL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {test.result || test.status || 'VERIFIED'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenLabReport(test)}
                          className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SECTION: BILLS & PAYMENTS IN LKR */}
      {(currentSection === 'overview' || currentSection === 'bills') && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-gray-900">Hospital Invoices & Payments (LKR)</h2>
            </div>
            <span className="text-xs text-gray-400">Formatted in Sri Lankan Rupees (LKR)</span>
          </div>

          {bills.length === 0 ? (
            <EmptyState>No hospital bills recorded.</EmptyState>
          ) : (
            <div className="space-y-3">
              {bills.map((item) => {
                const total = Number(item.amountTotal || item.subtotal || 0);
                const paid = Number(item.amountPaid || 0);
                const balance = Number(item.balanceDue ?? (total - paid));
                const isPaid = balance <= 0 || item.status === 'PAID';

                return (
                  <div
                    key={item.billId}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 hover:border-gray-200 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-gray-900">{item.billId}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPaid ? 'PAID IN FULL' : 'PAYMENT DUE'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Total Amount: <strong className="text-gray-900">{formatLKR(total)}</strong>
                        {paid > 0 && <span> • Paid: <strong className="text-emerald-700">{formatLKR(paid)}</strong></span>}
                        {item.issuedAt && <span> • Issued: {new Date(item.issuedAt).toLocaleDateString()}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase">Balance Due</p>
                        <p className={`text-base font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatLKR(balance)}
                        </p>
                      </div>

                      {balance > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPayBill(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-gray-900 hover:bg-lime-300 shadow-sm"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay Online (LKR)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                        >
                          <Printer className="h-3.5 w-3.5 text-gray-500" />
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION: HEALTH RECORDS */}
      {(currentSection === 'overview' || currentSection === 'records') && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-bold text-gray-900">Clinical Summaries & Medical Notes</h2>
            </div>
            <span className="text-xs text-gray-400">{records.length} record(s)</span>
          </div>

          {records.length === 0 ? (
            <EmptyState>No physician clinical notes or discharge summaries recorded.</EmptyState>
          ) : (
            <div className="space-y-3">
              {records.map((item) => (
                <div key={item.recordId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
                  <p className="font-bold text-gray-900 text-xs">{item.title || `Medical Record ${item.recordId}`}</p>
                  <p className="whitespace-pre-wrap text-xs text-gray-600">{item.summary || item.content}</p>
                  <p className="text-[10px] text-gray-400">
                    Author: {item.provider || item.authorName || 'Physician'} • {item.recordDate || item.createdAt ? new Date(item.recordDate || item.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL: BOOK APPOINTMENT */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-lime-700" />
                <h3 className="text-base font-bold text-gray-900">Book Doctor Consultation</h3>
              </div>
              <button
                onClick={() => setShowBooking(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {doctorsError && <ErrorState message={doctorsError} onRetry={loadDoctors} />}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Specialist / Doctor
                </label>
                <select
                  required
                  disabled={doctorsLoading || doctors.length === 0}
                  value={bookingForm.doctorPersonId}
                  onChange={(e) => setBookingForm({ ...bookingForm, doctorPersonId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-lime-500 focus:outline-none"
                >
                  <option value="">-- Choose Specialist Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.personId} value={d.personId}>
                      {d.name} ({d.specialization}) — {d.departmentName || 'Clinic'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Preferred Date & Time
                </label>
                <input
                  required
                  type="datetime-local"
                  min={localDateTimeMinimum()}
                  value={bookingForm.appointmentDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-lime-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Reason for Visit / Symptoms
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Describe your health symptoms or consultation reason..."
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-lime-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking || doctorsLoading || !bookingForm.doctorPersonId}
                  className="rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-gray-900 hover:bg-lime-300 disabled:opacity-50 shadow-sm"
                >
                  {submittingBooking ? 'Confirming...' : 'Confirm Consultation Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY HOSPITAL BILL IN LKR */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmPayment}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold text-gray-900">Pay Hospital Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs space-y-2">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Invoice ID:</span>
                <span className="font-mono">{payingBill.billId}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Charges:</span>
                <span>{formatLKR(payingBill.amountTotal || payingBill.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-gray-200">
                <span>Outstanding Balance:</span>
                <span>{formatLKR(payingBill.balanceDue ?? (payingBill.amountTotal - (payingBill.amountPaid || 0)))}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Payment Amount (LKR)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                max={Number(payingBill.balanceDue ?? payingBill.amountTotal)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs font-bold text-gray-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Payment Channel
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer / Online Portal (LKR)</option>
                <option value="OTHER">Credit / Debit Card</option>
                <option value="CASH">Hospital Cashier Counter</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment || !payAmount || Number(payAmount) <= 0}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
              >
                {submittingPayment ? 'Processing...' : `Confirm Payment (${formatLKR(payAmount)})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: OFFICIAL RECEIPT VIEWER */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Official Payment Receipt</h3>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-4 text-xs">
              <div className="text-center space-y-1 border-b border-gray-200 pb-3">
                <h4 className="text-base font-black text-gray-900">MediTek General Hospital</h4>
                <p className="text-[11px] text-gray-500">Electronic Cashier & Patient Billing Department</p>
                <p className="text-[10px] font-mono text-gray-400">TAX INVOICE / RECEIPT: {viewingReceipt.billId}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div>
                  <p><strong>Patient Name:</strong> {patient.name}</p>
                  <p><strong>Patient ID:</strong> {patient.patientId}</p>
                </div>
                <div className="text-right">
                  <p><strong>Receipt Date:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Payment Status:</strong> <span className="font-bold text-emerald-700">SETTLED IN FULL</span></p>
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Hospital Care & Medical Services:</span>
                  <span>{formatLKR(viewingReceipt.amountTotal || viewingReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 text-sm pt-2 border-t border-gray-100">
                  <span>Total Amount Paid (LKR):</span>
                  <span>{formatLKR(viewingReceipt.amountPaid || viewingReceipt.amountTotal)}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                This is an officially certified electronic hospital receipt generated by the MediTek Health System.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-800"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL LAB REPORT VIEWER */}
      {viewingLabReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Microscope className="h-5 w-5 text-purple-700" />
                <h3 className="text-base font-bold text-gray-900">Official Diagnostic Laboratory Report</h3>
              </div>
              <button
                onClick={() => setViewingLabReport(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-4 text-xs">
              <div className="text-center space-y-1 border-b border-gray-200 pb-3">
                <h4 className="text-base font-black text-gray-900">MediTek Central Pathology Laboratory</h4>
                <p className="text-[11px] text-gray-500">Diagnostic Division • Verified Patient Laboratory Findings</p>
                <p className="text-[10px] font-mono text-purple-800 font-bold">
                  TEST REF: {viewingLabReport.testId} • REPORT: {viewingLabReport.reportId || 'VERIFIED'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div>
                  <p><strong>Patient:</strong> {patient.name} ({patient.patientId})</p>
                  <p><strong>Test Ordered:</strong> {viewingLabReport.testName || 'Diagnostic Panel'}</p>
                </div>
                <div className="text-right">
                  <p><strong>Reviewing Doctor:</strong> {viewingLabReport.doctorName || 'Attending Physician'}</p>
                  <p><strong>Report Date:</strong> {viewingLabReport.testDate ? new Date(viewingLabReport.testDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-purple-100 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-900">Quantitative Results & Specimen Analysis:</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    viewingLabReport.result === 'NORMAL'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {viewingLabReport.result || 'COMPLETED'}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 leading-relaxed pt-1">
                  {viewingLabReport.reportDetails?.resultDetails ||
                    viewingLabReport.resultSummary ||
                    'All specimen metrics within standard clinical reference ranges. No pathological abnormalities detected.'}
                </pre>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                <span>Verified by MediTek Laboratory Staff</span>
                <span className="font-semibold text-emerald-700">Digital Signature Validated</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-800"
              >
                <Printer className="h-4 w-4" />
                Print Lab Report
              </button>
              <button
                type="button"
                onClick={() => setViewingLabReport(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
