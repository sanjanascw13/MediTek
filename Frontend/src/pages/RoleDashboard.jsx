import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Stethoscope,
  Users,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Receipt,
  PackageCheck,
  Send,
  X,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  Sparkles,
  FileText,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import DashboardPage from './DashboardPage';
import PatientPortalPage from './PatientPortalPage';
import { EmptyState, ErrorState, LoadingState, UnavailableNotice } from '../components/ApiState';
import DoctorClinicalDashboard from '../components/dashboard/DoctorClinicalDashboard';
import LabWorkerDashboard from '../components/dashboard/LabWorkerDashboard';
import ReceptionistDashboard from '../components/dashboard/ReceptionistDashboard';

function DashboardCard({ label, value, icon: Icon, to }) {
  return (
    <Link to={to} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-lime-50 p-3 text-lime-800"><Icon className="h-6 w-6" /></div>
      </div>
    </Link>
  );
}

function ClinicalDashboard() {
  return <DoctorClinicalDashboard />;
}

function PharmacistDashboard() {
  const user = api.getCurrentUser();
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [dispensations, setDispensations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispensing modal state
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [dispenseQty, setDispenseQty] = useState('1');
  const [dispensing, setDispensing] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rxList, medList, dispList] = await Promise.all([
        api.getPrescriptions(),
        api.getMedicines(),
        api.getDispensations(),
      ]);
      setPrescriptions(rxList || []);
      setMedicines(medList || []);
      setDispensations(dispList || []);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load pharmacy workspace.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Fast medicine map
  const medicineMap = useMemo(() => {
    const map = new Map();
    (medicines || []).forEach((m) => {
      map.set(m.medicineId, m);
    });
    return map;
  }, [medicines]);

  // Extract all pending dispensable prescription items
  const pendingItems = useMemo(() => {
    const list = [];
    (prescriptions || []).forEach((rx) => {
      (rx.items || []).forEach((item) => {
        const remaining = item.remainingQuantity !== undefined
          ? item.remainingQuantity
          : (item.prescribedQuantity - (item.quantityDispensed || 0));
        if (remaining > 0) {
          const med = medicineMap.get(item.medicineId);
          list.push({
            prescriptionId: rx.prescriptionId,
            prescriptionDate: rx.prescriptionDate,
            patientId: rx.patientId,
            patientName: rx.patientName || rx.patientId,
            doctorId: rx.doctorId,
            doctorName: rx.doctorName || 'Attending Physician',
            instructions: rx.instructions || '',
            item,
            medicine: med,
            stock: med ? (med.quantity ?? med.stock ?? 0) : 0,
            unitPrice: med ? med.price : 0,
            remaining,
          });
        }
      });
    });
    return list;
  }, [prescriptions, medicineMap]);

  // Filtered pending list
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingItems;
    const q = searchQuery.toLowerCase();
    return pendingItems.filter((entry) =>
      entry.prescriptionId.toLowerCase().includes(q) ||
      (entry.patientName && entry.patientName.toLowerCase().includes(q)) ||
      (entry.patientId && entry.patientId.toLowerCase().includes(q)) ||
      (entry.doctorName && entry.doctorName.toLowerCase().includes(q)) ||
      (entry.item?.medicineName && entry.item.medicineName.toLowerCase().includes(q))
    );
  }, [pendingItems, searchQuery]);

  const openDispenseModal = (entry) => {
    setSelectedTarget(entry);
    const maxPossible = Math.min(entry.remaining, Math.max(1, entry.stock || 1));
    setDispenseQty(String(maxPossible));
    setModalError('');
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTarget) return;

    const qty = parseInt(dispenseQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (qty > selectedTarget.remaining) {
      setModalError(`Cannot dispense more than the remaining quantity (${selectedTarget.remaining}).`);
      return;
    }
    if (qty > selectedTarget.stock) {
      setModalError(`Insufficient stock in pharmacy (${selectedTarget.stock} available).`);
      return;
    }

    setDispensing(true);
    setModalError('');
    try {
      await api.dispensePrescription(
        selectedTarget.prescriptionId,
        selectedTarget.item.prescriptionItemId,
        qty
      );
      setSuccess(`Dispensed ${qty} unit(s) of ${selectedTarget.item.medicineName} for patient ${selectedTarget.patientName}. Invoice dispatched to the Billing Officer!`);
      setSelectedTarget(null);
      await loadWorkspace();
    } catch (err) {
      setModalError(api.getErrorMessage(err, 'Unable to record dispensation.'));
    } finally {
      setDispensing(false);
    }
  };

  const pendingPrescriptionsCount = useMemo(() => {
    const rxIds = new Set(pendingItems.map((it) => it.prescriptionId));
    return rxIds.size;
  }, [pendingItems]);

  const lowStockCount = useMemo(() => {
    return (medicines || []).filter((m) => ((m.quantity ?? m.stock ?? 0) < 20)).length;
  }, [medicines]);

  return (
    <section className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-7 rounded-3xl shadow-lg border border-gray-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-400 text-gray-950 font-bold text-xs uppercase tracking-wider">
              Pharmacist Portal
            </span>
            <span className="text-gray-400 text-xs">Central Pharmacy Dispensary</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome, {user?.name || user?.username || 'Pharmacist'}
          </h1>
          <p className="text-sm text-gray-300">
            Review doctor-prescribed medications, dispense items, and automatically dispatch invoices to Billing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadWorkspace}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            title="Refresh dispensary queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/pharmacy"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#a3e635] hover:bg-lime-400 text-gray-950 font-bold text-sm transition-all shadow-md active:scale-95"
          >
            <Pill className="w-4 h-4" />
            <span>Formulary & Stock</span>
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadWorkspace} />}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-sm font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Prescriptions</p>
              <p className="mt-1 text-3xl font-black text-amber-900">{pendingPrescriptionsCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-amber-700 font-medium">Awaiting pharmaceutical dispensation</p>
        </div>

        <div className="rounded-3xl border border-lime-100 bg-lime-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-lime-800">Dispensable Line Items</p>
              <p className="mt-1 text-3xl font-black text-lime-950">{pendingItems.length}</p>
            </div>
            <div className="rounded-2xl bg-lime-100 p-3 text-lime-800">
              <Pill className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-lime-700 font-medium">Medications with remaining quantity</p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Completed Dispensations</p>
              <p className="mt-1 text-3xl font-black text-blue-950">{dispensations.length}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-800">
              <PackageCheck className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-blue-700 font-medium">Dispatched & billed transactions</p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Formulary Medicines</p>
              <p className="mt-1 text-3xl font-black text-gray-900">{medicines.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-100 p-3 text-gray-700">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 font-medium">
            {lowStockCount > 0 ? (
              <span className="text-rose-600 font-semibold">{lowStockCount} items low on stock</span>
            ) : (
              'All inventory healthy'
            )}
          </p>
        </div>
      </div>

      {/* Main Worklist: Pending Dispensable Medicine List */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-lime-600" />
              Pending Dispensable Medicines
            </h2>
            <p className="text-xs text-gray-500">
              Doctor prescriptions waiting for dispensing. Review items, confirm quantity, and dispatch the bill to Billing.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, medicine, RX ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading pending dispensable medicine list..." />
        ) : filteredPending.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-lime-50 text-lime-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Pending Medicines to Dispense</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery
                ? `No pending prescription matching "${searchQuery}".`
                : 'All doctor prescriptions are currently fully dispensed. New doctor orders will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
                <tr>
                  <th className="py-3 px-4">Prescription</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Medication & Regimen</th>
                  <th className="py-3 px-4 text-center">Prescribed / Dispensed</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredPending.map((entry) => {
                  const hasStock = entry.stock >= entry.remaining;
                  const isOutOfStock = entry.stock <= 0;
                  return (
                    <tr key={`${entry.prescriptionId}-${entry.item.prescriptionItemId}`} className="hover:bg-lime-50/30 transition-colors">
                      {/* Prescription ID & Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        <div>{entry.prescriptionId}</div>
                        <div className="text-[10px] text-gray-400 font-sans font-normal">
                          {entry.prescriptionDate ? new Date(entry.prescriptionDate).toLocaleDateString() : 'Active'}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{entry.patientName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{entry.patientId}</div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4 text-gray-700">
                        <div className="font-semibold">{entry.doctorName}</div>
                        <div className="text-[10px] text-gray-400">{entry.doctorId}</div>
                      </td>

                      {/* Medication & Instructions */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-lime-600" />
                          <span>{entry.item.medicineName}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {entry.item.dosage} · {entry.item.frequency} {entry.item.durationDays ? `(${entry.item.durationDays} days)` : ''}
                        </div>
                        {entry.instructions && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-amber-100">
                            Notes: {entry.instructions}
                          </div>
                        )}
                      </td>

                      {/* Prescribed vs Dispensed */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-gray-900 font-semibold">{entry.item.prescribedQuantity}</span>
                        <span className="text-gray-400 text-[10px]"> / </span>
                        <span className="text-gray-500">{entry.item.quantityDispensed || 0}</span>
                      </td>

                      {/* Remaining to Dispense */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {entry.remaining} left
                        </span>
                      </td>

                      {/* In Stock */}
                      <td className="py-3.5 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            Out of stock
                          </span>
                        ) : hasStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {entry.stock} available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            Only {entry.stock} left
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDispenseModal(entry)}
                          disabled={isOutOfStock}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#a3e635] hover:bg-lime-400 text-gray-950 font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispense & Send Bill</span>
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

      {/* Recent Dispensations Audit List */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-lime-600" />
              Recent Dispensations & Dispatched Invoices
            </h3>
            <p className="text-xs text-gray-500">
              Audit log of medicines dispensed and forwarded to the Billing Officer.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-semibold">{dispensations.length} records</span>
        </div>

        {dispensations.length === 0 ? (
          <EmptyState>No dispensations have been recorded yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Dispensation ID</th>
                  <th className="py-2.5 px-4">Dispensed At</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Medicine</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total Dispatched</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {dispensations.slice(0, 10).map((record) => {
                  const total = ((record.quantity || 0) * (Number(record.unitPrice) || 0)).toFixed(2);
                  return (
                    <tr key={record.dispensationId} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{record.dispensationId}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {record.dispensedAt ? new Date(record.dispensedAt).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{record.patientName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{record.patientId}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{record.medicineName}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{record.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-600 font-mono">
                        ${Number(record.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">
                        ${total}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-lime-900 border border-lime-200">
                          <Receipt className="w-3 h-3 text-lime-700" />
                          Sent to Billing
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Dispense Modal */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleDispenseSubmit}
            className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-lime-600" />
                  Dispense Medication
                </h3>
                <p className="text-xs text-gray-500">Order: {selectedTarget.prescriptionId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Patient & Prescription Details Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Patient</span>
                  <p className="font-bold text-gray-900 text-sm">{selectedTarget.patientName}</p>
                  <p className="text-gray-500 font-mono text-[11px]">{selectedTarget.patientId}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Prescribing Doctor</span>
                  <p className="font-bold text-gray-900">{selectedTarget.doctorName}</p>
                  <p className="text-gray-500 text-[11px]">{selectedTarget.doctorId}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Medication</span>
                  <p className="font-bold text-gray-900">{selectedTarget.item.medicineName}</p>
                  <p className="text-[11px] text-gray-500">{selectedTarget.item.dosage} · {selectedTarget.item.frequency}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Remaining Need</span>
                  <p className="text-sm font-black text-amber-700">{selectedTarget.remaining} units</p>
                  <p className="text-[11px] text-gray-500">In stock: {selectedTarget.stock}</p>
                </div>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Quantity to Dispense Now
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={Math.min(selectedTarget.remaining, selectedTarget.stock)}
                  step="1"
                  required
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(e.target.value)}
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => setDispenseQty(String(Math.min(selectedTarget.remaining, selectedTarget.stock)))}
                  className="px-3 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                >
                  Max All
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Estimated bill item: ${(Number(dispenseQty || 0) * (selectedTarget.unitPrice || 0)).toFixed(2)} (${selectedTarget.unitPrice || 0}/unit)
              </p>
            </div>

            {/* Automatic Billing Notice */}
            <div className="p-3.5 rounded-2xl bg-lime-50 border border-lime-200 flex items-start gap-2.5 text-xs text-lime-950">
              <Receipt className="w-4 h-4 text-lime-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated Billing Dispatch</p>
                <p className="text-[11px] text-lime-800 mt-0.5">
                  Confirming this dispensation will decrement the central pharmacy inventory and automatically send this bill item to the <strong>Billing Officer (meditek_billing)</strong> for payment processing.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dispensing}
                className="px-5 py-2.5 rounded-2xl bg-[#a3e635] hover:bg-lime-400 text-gray-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {dispensing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Dispense…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm Dispense & Dispatch Bill</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function StaffDashboard() {
  const user = api.getCurrentUser();
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appointmentList, admissionList] = await Promise.all([
        api.getAppointments(),
        api.getActiveAdmissions(),
      ]);
      setAppointments(appointmentList.filter((item) => item.status === 'SCHEDULED'));
      setAdmissions(admissionList);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load operations dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Operations workspace</p>
        <h1 className="mt-1 text-3xl font-black text-gray-900">Welcome, {user?.name || 'Staff member'}</h1>
        <p className="mt-1 text-sm text-gray-500">Operational worklist for appointments and active admissions.</p>
      </div>
      {error && <ErrorState message={error} onRetry={loadWorkspace} />}
      {loading ? <LoadingState label="Loading operational worklist..." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardCard label="Scheduled appointments" value={appointments.length} icon={CalendarDays} to="/appointments" />
          <DashboardCard label="Active admissions" value={admissions.length} icon={ClipboardList} to="/wards" />
        </div>
      )}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Operational shortcuts</h2>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/wards">Inpatient admissions</Link>
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/pharmacy">Pharmacy inventory</Link>
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/labs">Laboratory worklist</Link>
        </div>
      </div>
    </section>
  );
}

export default function RoleDashboard() {
  const role = api.getCurrentRole();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <DashboardPage />;
  if (role === 'PATIENT') return <PatientPortalPage section="overview" />;
  if (role === 'DOCTOR') return <ClinicalDashboard />;
  if (role === 'PHARMACIST') return <PharmacistDashboard />;
  if (role === 'LAB_WORKER') return <LabWorkerDashboard />;
  if (role === 'RECEPTIONIST') return <ReceptionistDashboard />;
  if (role === 'STAFF') return <StaffDashboard />;
  return <UnavailableNotice module="Role dashboard" detail="Your account does not have a recognized frontend role. Contact an administrator to verify your account configuration." />;
}
