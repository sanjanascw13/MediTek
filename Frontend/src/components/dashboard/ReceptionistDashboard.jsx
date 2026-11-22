import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  Receipt,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Check,
  Eye,
  RefreshCw,
  X,
  FileText,
  User,
  ArrowRightLeft,
  Banknote,
  Printer,
  CreditCard,
  Building2,
  CalendarDays,
  ShieldCheck,
  Send,
  Pill,
} from 'lucide-react';
import { api } from '../../services/api';
import { EmptyState, ErrorState, LoadingState } from '../ApiState';

// Format currency as Sri Lankan Rupee (LKR)
const formatLKR = (amount) => {
  const val = Number(amount || 0);
  return `LKR ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ReceptionistDashboard() {
  const user = api.getCurrentUser();
  const [activeTab, setActiveTab] = useState('beds'); // 'beds' | 'billing' | 'patients'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Domain data
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Ward / Bed filters
  const [selectedWardFilter, setSelectedWardFilter] = useState('ALL');
  const [selectedBedStatusFilter, setSelectedBedStatusFilter] = useState('ALL');

  // Admission Modal state
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitDoctorId, setAdmitDoctorId] = useState('');
  const [admitReason, setAdmitReason] = useState('Inpatient observation and medical stabilization');
  const [submittingAdmission, setSubmittingAdmission] = useState(false);

  // Bed Transfer Modal state
  const [transferTarget, setTransferTarget] = useState(null);
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Routine ward / room relocation');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Billing & Invoice Generation Modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [billPatientId, setBillPatientId] = useState('');
  const [billItems, setBillItems] = useState([
    { description: 'Outpatient Consultation & Registration Fee', quantity: 1, unitPrice: 2500 },
  ]);
  const [submittingBill, setSubmittingBill] = useState(false);

  // Payment Collection Modal state
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Receipt Viewer Modal state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Walk-in Patient Registration Modal state
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    dateOfBirth: '1995-01-01',
    gender: 'MALE',
    phoneNumber: '+94 77 000 0000',
    email: '',
    address: 'Colombo, Sri Lanka',
    emergencyContact: '+94 71 000 0000',
  });
  const [submittingPatient, setSubmittingPatient] = useState(false);

  // Search queries
  const [bedSearchQuery, setBedSearchQuery] = useState('');
  const [billSearchQuery, setBillSearchQuery] = useState('');

  const loadReceptionWorkspace = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [wardList, bedList, admList, billList, patList, docList] = await Promise.all([
        api.getWards().catch(() => []),
        api.getBeds().catch(() => []),
        api.getActiveAdmissions().catch(() => []),
        api.getBills().catch(() => []),
        api.getPatients().catch(() => []),
        api.getDoctors().catch(() => []),
      ]);

      const wardsSafe = Array.isArray(wardList) ? wardList : [];
      const bedsSafe = Array.isArray(bedList) ? bedList : [];
      const admsSafe = Array.isArray(admList) ? admList : [];
      const billsSafe = Array.isArray(billList) ? billList : [];
      const patsSafe = Array.isArray(patList) ? patList : [];
      const docsSafe = Array.isArray(docList) ? docList : [];

      setWards(wardsSafe);
      setBeds(bedsSafe);
      setAdmissions(admsSafe);
      setBills(billsSafe);
      setPatients(patsSafe);
      setDoctors(docsSafe);

      const activePids = new Set(admsSafe.map((a) => a.patientPersonId));
      const unadmitted = patsSafe.filter((p) => !activePids.has(p.personId));
      if (unadmitted.length > 0) {
        setAdmitPatientId((prev) => (prev && unadmitted.some((p) => p.personId === prev) ? prev : unadmitted[0].personId));
      }
      if (docsSafe.length > 0) {
        setAdmitDoctorId((prev) => (prev && docsSafe.some((d) => d.personId === prev) ? prev : docsSafe[0].personId));
      }
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load front-desk workspace.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReceptionWorkspace();
  }, [loadReceptionWorkspace]);

  // Active unadmitted patients
  const activePatientPersonIds = useMemo(() => new Set(admissions.map((a) => a.patientPersonId)), [admissions]);
  const eligiblePatients = useMemo(() => patients.filter((p) => !activePatientPersonIds.has(p.personId)), [patients, activePatientPersonIds]);

  // Open Admit modal for specific bed
  const handleOpenAdmitModal = (preselectedBedId = '') => {
    const candidateBed = preselectedBedId || (availableBeds.length > 0 ? availableBeds[0].bedId : '');
    setAdmitBedId(candidateBed);
    const candidatePatient = eligiblePatients.length > 0 ? eligiblePatients[0].personId : '';
    setAdmitPatientId(candidatePatient);
    if (!admitDoctorId && doctors.length > 0) {
      setAdmitDoctorId(doctors[0].personId || '');
    }
    setShowAdmitModal(true);
  };

  // Submit patient admission
  const handleSubmitAdmission = async (e) => {
    e.preventDefault();
    if (!admitPatientId || !admitBedId || !admitDoctorId) {
      setError('Please select patient, bed, and attending doctor.');
      return;
    }

    setSubmittingAdmission(true);
    setError('');
    try {
      await api.admitPatient({
        patientPersonId: admitPatientId,
        bedId: admitBedId,
        admittingDoctorPersonId: admitDoctorId,
        reason: admitReason || 'Inpatient care and monitoring',
      });

      setSuccessMsg(`Patient admitted successfully into bed ${admitBedId}! Record routed to attending doctor's care desk.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowAdmitModal(false);
      await loadReceptionWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to admit patient. Please ensure bed is AVAILABLE.'));
    } finally {
      setSubmittingAdmission(false);
    }
  };

  // Submit bed transfer
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!transferTarget || !targetBedId) {
      setError('Please choose a valid available target bed.');
      return;
    }

    setSubmittingTransfer(true);
    setError('');
    try {
      await api.transferBed({
        currentAdmissionId: transferTarget.admissionId,
        targetBedId: targetBedId,
        reason: transferReason || 'Ward re-assignment',
      });

      setSuccessMsg(`Patient ${transferTarget.patientName} transferred to bed ${targetBedId} successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setTransferTarget(null);
      await loadReceptionWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Bed transfer failed. Target bed must be AVAILABLE.'));
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Invoice line item helpers
  const handleAddBillItem = () => {
    setBillItems((prev) => [
      ...prev,
      { description: 'Hospital Care / Facility Charge', quantity: 1, unitPrice: 1500 },
    ]);
  };

  const handleRemoveBillItem = (index) => {
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBillItemChange = (index, field, value) => {
    setBillItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Submit new invoice
  const handleSubmitBill = async (e) => {
    e.preventDefault();
    if (!billPatientId) {
      setError('Please select a patient for the invoice.');
      return;
    }
    if (billItems.length === 0 || billItems.some((i) => !i.description.trim())) {
      setError('Please add at least one line item with a description.');
      return;
    }

    setSubmittingBill(true);
    setError('');
    try {
      const payload = {
        patientId: billPatientId,
        taxRatePercent: 0,
        items: billItems.map((item) => ({
          description: item.description,
          quantity: parseInt(item.quantity, 10) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      };

      const created = await api.createBill(payload);
      setSuccessMsg(`Invoice ${created.billId || ''} created successfully! Total: ${formatLKR(created.amountTotal)}.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowBillModal(false);
      await loadReceptionWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to create invoice.'));
    } finally {
      setSubmittingBill(false);
    }
  };

  // Open Payment modal
  const handleOpenPaymentModal = (bill) => {
    setSelectedBillForPayment(bill);
    const balance = Number(bill.balanceDue ?? (bill.amountTotal - (bill.amountPaid || 0)));
    setPaymentAmount(balance > 0 ? String(balance) : '0');
    setPaymentMethod('CASH');
  };

  // Submit payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setError('Enter a valid payment amount in LKR.');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    try {
      const billId = selectedBillForPayment.billId;
      const paymentRequestId = `PAY-REQ-${Date.now()}`;
      await api.recordBillPayment(billId, {
        amount: amountNum,
        paymentMethod: paymentMethod,
        paymentRequestId: paymentRequestId,
      });

      setSuccessMsg(`Payment of ${formatLKR(amountNum)} recorded for invoice ${billId}. Receipt generated.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setSelectedBillForPayment(null);
      await loadReceptionWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to record payment.'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Register new patient
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.name.trim() || !newPatientForm.email.trim()) {
      setError('Patient full name and email are required.');
      return;
    }

    setSubmittingPatient(true);
    setError('');
    try {
      const created = await api.createPatient(newPatientForm);
      setSuccessMsg(`Patient "${created.name}" registered with ID ${created.patientId || created.personId}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowNewPatientModal(false);
      setNewPatientForm({
        name: '',
        dateOfBirth: '1995-01-01',
        gender: 'MALE',
        phoneNumber: '+94 77 000 0000',
        email: '',
        address: 'Colombo, Sri Lanka',
        emergencyContact: '+94 71 000 0000',
      });
      await loadReceptionWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to register patient. Check email uniqueness.'));
    } finally {
      setSubmittingPatient(false);
    }
  };

  // KPI Computations
  const availableBeds = useMemo(() => {
    const activeBedIds = new Set(admissions.map((a) => a.bedId));
    return beds.filter((b) => (b.availabilityStatus === 'AVAILABLE' || !b.availabilityStatus) && b.operationalStatus === 'AVAILABLE' && !activeBedIds.has(b.bedId));
  }, [beds, admissions]);

  const occupiedBeds = useMemo(() => {
    const activeBedIds = new Set(admissions.map((a) => a.bedId));
    return beds.filter((b) => b.availabilityStatus === 'OCCUPIED' || activeBedIds.has(b.bedId));
  }, [beds, admissions]);

  const unpaidBills = bills.filter((b) => b.status === 'PENDING' || b.status === 'PARTIALLY_PAID');
  const totalSettledRevenue = bills.reduce((sum, b) => sum + Number(b.amountPaid || 0), 0);

  // Group beds by ward
  const bedsByWard = useMemo(() => {
    const map = {};
    wards.forEach((w) => {
      map[w.wardId] = { ward: w, beds: [] };
    });
    // Add fallback for beds without ward mapping
    map['UNASSIGNED'] = { ward: { wardId: 'UNASSIGNED', wardName: 'General Care Unit' }, beds: [] };

    beds.forEach((bed) => {
      const wId = bed.wardId || 'UNASSIGNED';
      if (!map[wId]) {
        map[wId] = { ward: { wardId: wId, wardName: bed.wardName || 'Hospital Ward' }, beds: [] };
      }
      map[wId].beds.push(bed);
    });

    return Object.values(map).filter((item) => item.beds.length > 0);
  }, [wards, beds]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-200">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
                Front Desk & Admissions Center
              </span>
              <span className="text-xs text-gray-500">
                Outpatient Department (OPD) & Cashier Desk
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              Welcome, {user?.name || 'Emma Watson'}
            </h1>
            <p className="text-xs text-gray-500">
              Bed availability, patient intake & admissions, invoice billing (LKR), and payment receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadReceptionWorkspace(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            title="Refresh front desk data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-cyan-700' : 'text-gray-500'}`} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenAdmitModal()}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-700"
          >
            <Bed className="h-4 w-4" />
            Admit Patient
          </button>
          <button
            onClick={() => setShowBillModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Receipt className="h-4 w-4" />
            Generate Invoice
          </button>
          <Link
            to="/pharmacy"
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800"
          >
            <Pill className="h-4 w-4 text-lime-400" />
            Pharmacy & Inventory
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && <ErrorState message={error} onRetry={() => loadReceptionWorkspace()} />}
      {successMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Beds</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">{availableBeds.length}</p>
              <p className="mt-0.5 text-xs text-gray-400">Ready for admission</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Bed className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Inpatients</p>
              <p className="mt-1 text-2xl font-black text-blue-600">{admissions.length}</p>
              <p className="mt-0.5 text-xs text-gray-400">Occupying ward beds</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Invoices</p>
              <p className="mt-1 text-2xl font-black text-amber-600">{unpaidBills.length}</p>
              <p className="mt-0.5 text-xs text-gray-400">Awaiting cashier settlement</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settled Revenue</p>
              <p className="mt-1 text-lg font-black text-gray-900">{formatLKR(totalSettledRevenue)}</p>
              <p className="mt-0.5 text-xs text-emerald-600 font-semibold">Total Hospital Intake</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('beds')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'beds'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bed className="h-4 w-4" />
          Ward & Bed Availability Radar
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === 'beds' ? 'bg-white text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {availableBeds.length} Free
          </span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'billing'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Billing & Cashier Desk (LKR)
          {unpaidBills.length > 0 && (
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === 'billing' ? 'bg-white text-cyan-800' : 'bg-amber-100 text-amber-800'}`}>
              {unpaidBills.length} Due
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'patients'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="h-4 w-4" />
          Patient Registry & Intake
        </button>
      </div>

      {/* MAIN TAB CONTENT */}
      {loading ? (
        <LoadingState label="Loading front-desk records and live bed radar..." />
      ) : (
        <>
          {/* TAB 1: BED AVAILABILITY RADAR */}
          {activeTab === 'beds' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Filter Ward:</span>
                  <select
                    value={selectedWardFilter}
                    onChange={(e) => setSelectedWardFilter(e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ALL">All Hospital Wards</option>
                    {wards.map((w) => (
                      <option key={w.wardId} value={w.wardId}>
                        {w.wardName}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500"></span>
                    <span className="text-gray-600">Available ({availableBeds.length})</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500"></span>
                    <span className="text-gray-600">Occupied ({occupiedBeds.length})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdmitModal()}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-cyan-700"
                  >
                    <Plus className="h-4 w-4" />
                    New Admission
                  </button>
                </div>
              </div>

              {/* Ward Grid */}
              <div className="space-y-6">
                {bedsByWard
                  .filter((group) => selectedWardFilter === 'ALL' || group.ward.wardId === selectedWardFilter)
                  .map((group) => (
                    <div key={group.ward.wardId} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-cyan-700" />
                          <h3 className="text-base font-bold text-gray-900">{group.ward.wardName}</h3>
                          <span className="text-xs text-gray-400">({group.ward.wardId})</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          {group.beds.length} beds allocated
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {group.beds.map((bed) => {
                          const activeAdmission = admissions.find((a) => a.bedId === bed.bedId);
                          const isOccupied = bed.availabilityStatus === 'OCCUPIED' || Boolean(activeAdmission);
                          const isFree = !isOccupied && bed.operationalStatus === 'AVAILABLE';

                          return (
                            <div
                              key={bed.bedId}
                              className={`rounded-2xl border p-4 transition space-y-3 ${
                                isFree
                                  ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 hover:shadow-sm'
                                  : 'border-red-200 bg-red-50/30'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-xs font-black text-gray-900">Bed {bed.bedNumber}</span>
                                  <p className="text-[11px] text-gray-400">{bed.bedId}</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {isFree ? 'AVAILABLE' : 'OCCUPIED'}
                                </span>
                              </div>

                              {isFree ? (
                                <div className="space-y-2 pt-2">
                                  <p className="text-xs text-emerald-700 font-medium">Ready for immediate patient assignment</p>
                                  <button
                                    onClick={() => handleOpenAdmitModal(bed.bedId)}
                                    className="w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                  >
                                    Admit to this Bed
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5 pt-1 text-xs">
                                  <div className="text-gray-800">
                                    <span className="font-semibold">{activeAdmission?.patientName || 'Inpatient Admitted'}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500">
                                    Doctor: {activeAdmission?.admittingDoctorName || 'Attending Physician'}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setTransferTarget(activeAdmission || { admissionId: bed.bedId, patientName: 'Inpatient', bedNumber: bed.bedNumber });
                                      setShowAdmitModal(false);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900"
                                  >
                                    <ArrowRightLeft className="h-3 w-3" />
                                    Transfer Bed
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: BILLING & CASHIER DESK (LKR) */}
          {activeTab === 'billing' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                    Patient Billing & Invoices (LKR)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Front desk cashier invoice generation, payment processing, and receipt reconciliation in Sri Lankan Rupees.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={billSearchQuery}
                      onChange={(e) => setBillSearchQuery(e.target.value)}
                      placeholder="Search bills by patient or ID..."
                      className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Generate Invoice
                  </button>
                </div>
              </div>

              {bills.length === 0 ? (
                <EmptyState>No invoices have been generated yet.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Invoice ID</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Issued Date</th>
                        <th className="px-4 py-3">Total (LKR)</th>
                        <th className="px-4 py-3">Paid (LKR)</th>
                        <th className="px-4 py-3">Balance Due (LKR)</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Cashier Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {bills
                        .filter((b) => {
                          if (!billSearchQuery.trim()) return true;
                          const q = billSearchQuery.toLowerCase();
                          return (b.billId || '').toLowerCase().includes(q) || (b.patientName || '').toLowerCase().includes(q);
                        })
                        .map((bill) => {
                          const balance = Number(bill.balanceDue ?? (bill.amountTotal - (bill.amountPaid || 0)));
                          const isFullyPaid = bill.status === 'PAID' || balance <= 0;

                          return (
                            <tr key={bill.billId} className="hover:bg-gray-50/70 transition">
                              <td className="px-4 py-4 font-mono text-xs font-bold text-gray-900">
                                {bill.billId}
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-bold text-gray-900">{bill.patientName || 'Patient'}</p>
                                <span className="text-xs text-gray-400">ID: {bill.patientId || bill.patientPersonId}</span>
                              </td>
                              <td className="px-4 py-4 text-xs text-gray-500">
                                {bill.issuedAt ? new Date(bill.issuedAt).toLocaleDateString() : 'Today'}
                              </td>
                              <td className="px-4 py-4 font-semibold text-gray-900">
                                {formatLKR(bill.amountTotal)}
                              </td>
                              <td className="px-4 py-4 text-xs font-semibold text-emerald-700">
                                {formatLKR(bill.amountPaid || 0)}
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-amber-700">
                                {formatLKR(balance)}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  isFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {bill.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right space-x-2">
                                {!isFullyPaid && (
                                  <button
                                    onClick={() => handleOpenPaymentModal(bill)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Collect Payment
                                  </button>
                                )}
                                <button
                                  onClick={() => setViewingReceipt(bill)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                                >
                                  <Printer className="h-3.5 w-3.5 text-gray-500" />
                                  Receipt
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PATIENT REGISTRY & INTAKE */}
          {activeTab === 'patients' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-cyan-600" />
                    Patient Registry & Intake
                  </h2>
                  <p className="text-xs text-gray-500">
                    Register walk-in patients and view master electronic medical profiles.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewPatientModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4" />
                  Register Walk-in Patient
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Patient ID</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Phone & Email</th>
                      <th className="px-4 py-3">Gender / DOB</th>
                      <th className="px-4 py-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {patients.map((pat) => (
                      <tr key={pat.personId} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-4 font-mono text-xs font-bold text-gray-900">
                          {pat.patientId || pat.personId}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900">
                          {pat.name}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600">
                          <p>{pat.phoneNumber || '—'}</p>
                          <p className="text-gray-400">{pat.email}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600">
                          {pat.gender || 'Not specified'} • {pat.dateOfBirth || '—'}
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setAdmitPatientId(pat.personId);
                              setShowAdmitModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                          >
                            <Bed className="h-3.5 w-3.5" />
                            Admit
                          </button>
                          <button
                            onClick={() => {
                              setBillPatientId(pat.patientId || pat.personId);
                              setShowBillModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADMISSION MODAL */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-50 p-2.5 text-cyan-700">
                  <Bed className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Admit Patient to Ward Bed</h3>
                  <p className="text-xs text-gray-500">Inpatient intake and bed assignment</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdmission} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Patient (Unadmitted)
                </label>
                {eligiblePatients.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    ⚠️ All registered patients currently have active admissions. Register a new walk-in patient from the "Patient Registry & Intake" tab first.
                  </p>
                ) : (
                  <select
                    value={admitPatientId}
                    onChange={(e) => setAdmitPatientId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Eligible Patient --</option>
                    {eligiblePatients.map((p) => (
                      <option key={p.personId} value={p.personId}>
                        {p.name} ({p.patientId || p.personId})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Available Ward Bed
                </label>
                <select
                  value={admitBedId}
                  onChange={(e) => setAdmitBedId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Available Bed --</option>
                  {availableBeds.map((b) => (
                    <option key={b.bedId} value={b.bedId}>
                      {b.wardName || 'Ward'} — Bed {b.bedNumber} ({b.bedId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Attending Physician / Doctor
                </label>
                <select
                  value={admitDoctorId}
                  onChange={(e) => setAdmitDoctorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Attending Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.personId} value={d.personId}>
                      {d.name} ({d.doctorId || d.personId}) — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Reason for Admission / Condition
                </label>
                <textarea
                  rows={2}
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  placeholder="Post-surgical observation, intravenous antibiotics, vitals monitoring"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmission}
                  className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-200 hover:bg-cyan-700 disabled:opacity-50"
                >
                  <Bed className="h-4 w-4" />
                  {submittingAdmission ? 'Admitting...' : 'Confirm Patient Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BED TRANSFER MODAL */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Transfer Inpatient Bed</h3>
                  <p className="text-xs text-gray-500">Patient: {transferTarget.patientName}</p>
                </div>
              </div>
              <button
                onClick={() => setTransferTarget(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Target Available Bed
                </label>
                <select
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Target Available Bed --</option>
                  {availableBeds.map((b) => (
                    <option key={b.bedId} value={b.bedId}>
                      {b.wardName || 'Ward'} — Bed {b.bedNumber} ({b.bedId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Reason for Transfer
                </label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Patient upgraded to private ward, or step-down from ICU"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTransferTarget(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  {submittingTransfer ? 'Transferring...' : 'Execute Bed Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE INVOICE MODAL (LKR) */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Generate Patient Invoice (LKR)</h3>
                  <p className="text-xs text-gray-500">Outpatient & Inpatient fee calculation in Sri Lankan Rupees</p>
                </div>
              </div>
              <button
                onClick={() => setShowBillModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Patient
                </label>
                <select
                  value={billPatientId}
                  onChange={(e) => setBillPatientId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.patientId || p.personId} value={p.patientId || p.personId}>
                      {p.name} ({p.patientId || p.personId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Billable Services & Fees (LKR)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBillItem}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Service Line
                  </button>
                </div>

                {billItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-3">
                    <div className="col-span-6">
                      <span className="text-[11px] font-semibold text-gray-500">Service Description</span>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleBillItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Doctor Consultation Fee, Room Charge"
                        className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] font-semibold text-gray-500">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleBillItemChange(idx, 'quantity', e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <span className="text-[11px] font-semibold text-gray-500">Unit Price (LKR)</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={item.unitPrice}
                        onChange={(e) => handleBillItemChange(idx, 'unitPrice', e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-center pb-1">
                      {billItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBillItem(idx)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          title="Remove Line"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Subtotal preview */}
                <div className="rounded-xl border border-gray-200 bg-white p-3 text-right">
                  <span className="text-xs text-gray-500">Total Invoice Amount: </span>
                  <span className="text-base font-black text-gray-900">
                    {formatLKR(billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Receipt className="h-4 w-4" />
                  {submittingBill ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL (LKR) */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Record Cashier Payment (LKR)</h3>
                  <p className="text-xs text-gray-500">Invoice: {selectedBillForPayment.billId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBillForPayment(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient Name:</span>
                <span className="font-bold text-gray-900">{selectedBillForPayment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Invoice Amount:</span>
                <span className="font-semibold text-gray-800">{formatLKR(selectedBillForPayment.amountTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-bold">
                <span className="text-amber-800">Remaining Balance:</span>
                <span className="text-amber-700 font-black">
                  {formatLKR(selectedBillForPayment.balanceDue ?? (selectedBillForPayment.amountTotal - (selectedBillForPayment.amountPaid || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Payment Method
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <label className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition ${
                    paymentMethod === 'CASH' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="payMethod"
                      value="CASH"
                      checked={paymentMethod === 'CASH'}
                      onChange={() => setPaymentMethod('CASH')}
                      className="sr-only"
                    />
                    💵 Cash
                  </label>
                  <label className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition ${
                    paymentMethod === 'BANK_TRANSFER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="payMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={() => setPaymentMethod('BANK_TRANSFER')}
                      className="sr-only"
                    />
                    💳 Card / Bank
                  </label>
                  <label className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition ${
                    paymentMethod === 'OTHER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="payMethod"
                      value="OTHER"
                      checked={paymentMethod === 'OTHER'}
                      onChange={() => setPaymentMethod('OTHER')}
                      className="sr-only"
                    />
                    🛡️ Insurance
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Received Amount (LKR)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">LKR</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-12 pr-3 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBillForPayment(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMAL PRINTABLE RECEIPT MODAL (LKR) */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Printable Receipt Layout */}
            <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-4">
              {/* Header */}
              <div className="border-b border-gray-200 pb-4 text-center">
                <div className="flex justify-center mb-2">
                  <img
                    src="/meditek-logo-tight.png"
                    alt="MediTeck Logo"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">MediTeck Hospital</h3>
                <p className="text-xs text-gray-500">Outpatient Department & Admissions Desk</p>
                <p className="text-[11px] text-gray-400">No. 45, Hospital Road, Colombo 07 • Tel: +94 11 234 5678</p>
                <div className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800">
                  OFFICIAL RECEIPT (LKR)
                </div>
              </div>

              {/* Receipt details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Invoice ID:</span>
                  <p className="font-mono font-bold text-gray-800">{viewingReceipt.billId}</p>
                </div>
                <div>
                  <span className="text-gray-400">Date & Time:</span>
                  <p className="font-semibold text-gray-800">{viewingReceipt.issuedAt ? new Date(viewingReceipt.issuedAt).toLocaleString() : 'Today'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Patient Name:</span>
                  <p className="font-bold text-gray-900">{viewingReceipt.patientName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Cashier:</span>
                  <p className="font-semibold text-gray-800">{user?.name || 'Emma Watson'}</p>
                </div>
              </div>

              {/* Line items table */}
              <div className="border-t border-gray-100 pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400">
                      <th className="py-1">Description</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(viewingReceipt.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-800">{item.description}</td>
                        <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900">{formatLKR(item.lineTotal || (item.quantity * item.unitPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="border-t border-gray-200 pt-3 text-right space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Gross Total:</span>
                  <span className="font-semibold text-gray-800">{formatLKR(viewingReceipt.amountTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-700">{formatLKR(viewingReceipt.amountPaid || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-gray-100 pt-1.5">
                  <span className="text-gray-900">Balance Due:</span>
                  <span className="text-gray-900">{formatLKR(viewingReceipt.balanceDue ?? (viewingReceipt.amountTotal - (viewingReceipt.amountPaid || 0)))}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-gray-400 border-t border-dashed border-gray-200">
                Thank you for choosing MediTek. Please retain this receipt for insurance claims.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
              >
                <Printer className="h-4 w-4" />
                Print Official Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN PATIENT REGISTRATION MODAL */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-50 p-2.5 text-cyan-700">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Register Walk-in Patient</h3>
                  <p className="text-xs text-gray-500">Add to hospital master health registry</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  placeholder="e.g. Kasun Chamara Perera"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatientForm.dateOfBirth}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide">Gender</label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide">Phone Number</label>
                  <input
                    type="text"
                    value={newPatientForm.phoneNumber}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phoneNumber: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wide">Residential Address</label>
                <input
                  type="text"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                  placeholder="No. 12, Main Street, Kandy"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPatient}
                  className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 font-bold text-white shadow-md shadow-cyan-200 hover:bg-cyan-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {submittingPatient ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
