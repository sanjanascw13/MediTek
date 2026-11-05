import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Building2,
  CheckCircle,
  Pill,
  Search,
  Plus,
  FilePlus,
  Trash2,
  Clock,
  User,
  AlertCircle,
  X,
  Send,
  Calendar,
  Check,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const emptyItem = () => ({
  medicineId: '',
  prescribedQuantity: '10',
  dosage: '1 tablet',
  frequency: 'Three times daily',
  durationDays: '5',
});

const emptyPrescriptionForm = () => ({
  patientId: '',
  doctorId: '',
  instructions: '',
  items: [emptyItem()],
});

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [dispensations, setDispensations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    category: 'Analgesic',
    price: '25.00',
    stockQuantity: '100',
    departmentId: '',
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dispensing state
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedPrescriptionItem, setSelectedPrescriptionItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);

  // Doctor prescription creation state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState(emptyPrescriptionForm());

  const role = api.getCurrentRole();
  const canPrescribe = ['DOCTOR', 'SUPER_ADMIN', 'ADMIN'].includes(role);
  const canDispense = ['STAFF', 'SUPER_ADMIN', 'ADMIN', 'PHARMACIST'].includes(role);
  const canAddMedicine = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  const loadData = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const [medicineList, deptList] = await Promise.all([
        api.getMedicines(query),
        api.getDepartments(),
      ]);
      setMedicines(medicineList);
      const depts = Array.isArray(deptList) ? deptList : [];
      setDepartments(depts);
      setMedicineForm((current) => ({
        ...current,
        departmentId: current.departmentId || depts[0]?.departmentId || '',
      }));
      if (api.isMockMode()) {
        setPrescriptions([]);
        setDispensations([]);
      } else {
        const [prescriptionList, dispensationList] = await Promise.all([
          api.getPrescriptions(),
          api.getDispensations(),
        ]);
        setPrescriptions(prescriptionList);
        setDispensations(dispensationList);
      }

      if (canPrescribe) {
        const [patientList, doctorList] = await Promise.all([
          api.getPatients(),
          api.getDoctors(),
        ]);
        setPatients(patientList);
        setDoctors(doctorList);

        const currentDoctor = doctorList.find(
          (d) => d.personId === api.getCurrentUser()?.personId
        );
        setPrescriptionForm((current) => ({
          ...current,
          doctorId: current.doctorId || currentDoctor?.doctorId || doctorList[0]?.doctorId || '',
          patientId: current.patientId || patientList[0]?.patientId || '',
        }));
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load pharmacy inventory.'));
    } finally {
      setLoading(false);
    }
  }, [canPrescribe]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(search), api.isMockMode() ? 0 : 250);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const filtered = medicines.filter((m) =>
    (m.name + (m.category || '')).toLowerCase().includes(search.toLowerCase())
  );

  const dispense = async (event) => {
    event.preventDefault();
    if (!selectedMedicine) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (api.isMockMode()) {
        const updated = await api.dispenseMedicine(selectedMedicine.medicineId, quantity);
        setMedicines((current) =>
          current.map((item) => (item.medicineId === updated.medicineId ? updated : item))
        );
        setSuccess(`Demo dispensing recorded: ${quantity} unit(s) of ${updated.name}.`);
      } else {
        const [prescriptionId, itemId] = selectedPrescriptionItem.split('|');
        const record = await api.dispensePrescription(prescriptionId, itemId, quantity);
        await loadData(search);
        setSuccess(`Dispensation ${record.dispensationId} recorded for ${record.patientName}.`);
      }
      setSelectedMedicine(null);
      setSelectedPrescriptionItem('');
      setQuantity('1');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to dispense medication.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    if (!medicineForm.name.trim()) {
      setError('Medicine name is required.');
      return;
    }
    const priceNum = Number(medicineForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price (greater than or equal to 0).');
      return;
    }
    const stockNum = Number(medicineForm.stockQuantity);
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createMedicine({
        name: medicineForm.name.trim(),
        category: medicineForm.category.trim(),
        price: priceNum,
        stockQuantity: Math.floor(stockNum),
        departmentId: medicineForm.departmentId || null,
      });
      setSuccess(`Medicine "${created.name}" (${created.medicineId}) added successfully to formulary.`);
      setShowMedicineModal(false);
      setMedicineForm({
        name: '',
        category: 'Analgesic',
        price: '25.00',
        stockQuantity: '100',
        departmentId: departments[0]?.departmentId || '',
      });
      await loadData(search);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to add medicine item.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!prescriptionForm.patientId) {
      setError('Please select a patient.');
      return;
    }
    if (!prescriptionForm.doctorId) {
      setError('Please select a prescribing doctor.');
      return;
    }
    if (prescriptionForm.items.length === 0 || !prescriptionForm.items[0].medicineId) {
      setError('Please add at least one medication to the prescription.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        patientId: prescriptionForm.patientId,
        doctorId: prescriptionForm.doctorId,
        instructions: prescriptionForm.instructions.trim(),
        items: prescriptionForm.items.map((it) => ({
          medicineId: it.medicineId,
          prescribedQuantity: Number(it.prescribedQuantity),
          dosage: it.dosage.trim(),
          frequency: it.frequency.trim(),
          durationDays: Number(it.durationDays),
        })),
      };

      const created = await api.createPrescription(payload);
      setSuccess(`Prescription ${created.prescriptionId} issued and sent to the pharmacy dispensary!`);
      setShowPrescriptionModal(false);
      setPrescriptionForm((current) => ({
        ...emptyPrescriptionForm(),
        doctorId: current.doctorId,
        patientId: current.patientId,
      }));
      await loadData(search);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to issue prescription.'));
    } finally {
      setSaving(false);
    }
  };

  const addPrescriptionItem = () => {
    setPrescriptionForm((current) => ({
      ...current,
      items: [...current.items, emptyItem()],
    }));
  };

  const removePrescriptionItem = (index) => {
    setPrescriptionForm((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setPrescriptionForm((current) => ({
      ...current,
      items: current.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  };

  const eligiblePrescriptionItems = prescriptions.flatMap((prescription) =>
    (prescription.items || [])
      .filter((item) => item.medicineId === selectedMedicine?.medicineId && item.remainingQuantity > 0)
      .map((item) => ({
        ...item,
        prescriptionId: prescription.prescriptionId,
        patientId: prescription.patientId,
        patientName: prescription.patientName,
      }))
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Pharmacy Dispensary & Medicine Formulary
          </h2>
          <p className="text-sm text-gray-500">
            Clinical prescribing, inventory tracking, and pharmaceutical dispensation
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicine name, class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {canAddMedicine && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowMedicineModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs sm:text-sm hover:bg-lime-400 transition-all flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Medicine
            </button>
          )}

          {canPrescribe && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowPrescriptionModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gray-900 text-white font-bold text-xs sm:text-sm hover:bg-gray-800 transition-all flex items-center gap-2 shrink-0 shadow-sm"
            >
              <FilePlus className="w-4 h-4 text-lime-400" />
              Write Prescription
            </button>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => loadData(search)} />}
      {success && (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {success}
        </p>
      )}

      {/* Formulary Inventory Grid */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-lime-800" />
            Hospital Medication Stock & Pricing
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} medication(s) available
          </span>
        </div>

        {loading ? (
          <LoadingState label="Loading medicine inventory..." />
        ) : filtered.length === 0 ? (
          <EmptyState>No medicines found matching "{search}".</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((med) => {
              const eligible = eligiblePrescriptionItemsFor(med, prescriptions);
              return (
                <div
                  key={med.medicineId}
                  className="bg-white border border-gray-100 hover:border-lime-200 transition-all p-5 rounded-2xl shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-800 flex items-center justify-center font-bold text-xs shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {med.category || 'General'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{med.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Price: <strong className="text-gray-900">${Number(med.price).toFixed(2)}</strong>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-lime-700 shrink-0" />
                        <span className="truncate">{med.departmentName || 'Central Pharmacy'}</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-500">Stock:</span>
                      <span className={med.stock > 0 ? 'text-lime-800 font-bold' : 'text-rose-600 font-bold'}>
                        {med.stock} units
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1 ${
                        med.stock > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {med.stock > 0 ? 'Available' : 'Out of Stock'}
                    </span>

                    {canDispense && (
                      <button
                        type="button"
                        disabled={med.stock < 1 || (!api.isMockMode() && !eligible)}
                        onClick={() => {
                          setSelectedMedicine(med);
                          setSelectedPrescriptionItem('');
                          setError('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] transition-all disabled:opacity-40"
                      >
                        Dispense
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Prescriptions Queue */}
      {!api.isMockMode() && (
        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-lime-800" />
                Prescriptions Queue
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Doctor-issued clinical prescriptions pending pharmacy fulfillment
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-xl">
              {prescriptions.length} Prescriptions
            </span>
          </div>

          {prescriptions.length === 0 ? (
            <EmptyState>No prescriptions currently in the pharmacy queue.</EmptyState>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => {
                const totalItems = rx.items?.length || 0;
                const remaining = rx.items?.reduce((s, it) => s + (it.remainingQuantity || 0), 0) || 0;
                const isFulfilled = remaining === 0;

                return (
                  <div
                    key={rx.prescriptionId}
                    className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all bg-gray-50/50 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-lime-900 bg-lime-100 px-2 py-0.5 rounded-lg">
                          {rx.prescriptionId}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {rx.patientName} <span className="text-gray-400 font-normal">({rx.patientId})</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Prescribed by {rx.doctorName}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">{rx.prescribedAt ? new Date(rx.prescribedAt).toLocaleDateString() : '—'}</span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full ${
                            isFulfilled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isFulfilled ? 'COMPLETED' : 'PENDING DISPENSATION'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(rx.items || []).map((it) => (
                        <div
                          key={it.prescriptionItemId}
                          className="bg-white p-3 rounded-xl border border-gray-100 text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{it.medicineName}</p>
                            <p className="text-gray-500 text-[11px] mt-0.5">
                              {it.dosage} · {it.frequency} ({it.durationDays} days)
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lime-900">{it.remainingQuantity} left</span>
                            <p className="text-[10px] text-gray-400">of {it.prescribedQuantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {rx.instructions && (
                      <p className="text-xs text-gray-600 bg-white p-2 rounded-xl border border-gray-100">
                        <strong className="text-gray-700">Doctor's Clinical Notes:</strong> {rx.instructions}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Dispensing Modal */}
      {selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={dispense} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Dispense Medicine</h3>
              <button
                type="button"
                onClick={() => setSelectedMedicine(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1">
              <p className="font-bold text-gray-900">{selectedMedicine.name}</p>
              <p className="text-xs text-gray-500">
                Unit price: ${Number(selectedMedicine.price).toFixed(2)} · {selectedMedicine.stock} units available in formulary
              </p>
            </div>

            {!api.isMockMode() && (
              <label className="block text-xs font-semibold text-gray-700">
                Select Patient Prescription
                <select
                  required
                  value={selectedPrescriptionItem}
                  onChange={(event) => setSelectedPrescriptionItem(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="">Select a prescription in queue</option>
                  {eligiblePrescriptionItems.map((item) => (
                    <option
                      key={item.prescriptionItemId}
                      value={`${item.prescriptionId}|${item.prescriptionItemId}`}
                    >
                      {item.prescriptionId} · {item.patientName || item.patientId} · {item.remainingQuantity} units remaining
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-xs font-semibold text-gray-700">
              Quantity to Dispense
              <input
                required
                type="number"
                min="1"
                max={selectedMedicine.stock}
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </label>

            <p className="text-[11px] text-gray-500 bg-lime-50/70 p-2.5 rounded-xl border border-lime-200">
              💡 Dispensing records inventory deduction and automatically sends the invoice to the Billing Officer.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMedicine(null)}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (!api.isMockMode() && !selectedPrescriptionItem)}
                className="rounded-xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#8ddb16] disabled:opacity-50"
              >
                {saving ? 'Recording…' : 'Dispense & Dispatch Bill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Prescription Modal (Doctor / Admin) */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleCreatePrescription}
            className="w-full max-w-2xl my-8 space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-lime-800" />
                <h3 className="text-xl font-bold text-gray-900">Write Patient Prescription</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Patient <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={prescriptionForm.patientId}
                  onChange={(e) =>
                    setPrescriptionForm((c) => ({ ...c, patientId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="">Select a patient</option>
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} ({p.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Prescribing Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={prescriptionForm.doctorId}
                  onChange={(e) =>
                    setPrescriptionForm((c) => ({ ...c, doctorId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.name} ({d.specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prescription Items */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                  Prescribed Medications
                </h4>
                <button
                  type="button"
                  onClick={addPrescriptionItem}
                  className="text-xs font-bold text-lime-900 bg-lime-100 hover:bg-lime-200 px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Medication
                </button>
              </div>

              {prescriptionForm.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3 relative"
                >
                  {prescriptionForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrescriptionItem(idx)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Remove medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Medicine
                      </label>
                      <select
                        required
                        value={it.medicineId}
                        onChange={(e) => updateItem(idx, 'medicineId', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                      >
                        <option value="">Select from formulary</option>
                        {medicines.map((m) => (
                          <option key={m.medicineId} value={m.medicineId}>
                            {m.name} ({m.category}) - ${Number(m.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1 tablet, 2 capsules"
                        value={it.dosage}
                        onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Frequency
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Three times daily"
                        value={it.frequency}
                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Days
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="5"
                        value={it.durationDays}
                        onChange={(e) => updateItem(idx, 'durationDays', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="10"
                        value={it.prescribedQuantity}
                        onChange={(e) => updateItem(idx, 'prescribedQuantity', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Doctor's instructions */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Clinical Instructions & Pharmacy Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Take immediately after meals with warm water. Avoid dairy products."
                value={prescriptionForm.instructions}
                onChange={(e) =>
                  setPrescriptionForm((c) => ({ ...c, instructions: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#8ddb16] disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.3)]"
              >
                {saving ? (
                  'Issuing...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send to Pharmacy
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History table */}
      {!api.isMockMode() && (
        <section className="space-y-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Dispensing History</h3>
            <p className="text-xs text-gray-500">History of fulfilled medication dispensations</p>
          </div>
          {dispensations.length === 0 ? (
            <EmptyState>No dispensing history is available yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Prescription</th>
                    <th className="p-3">Dispensed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispensations.map((record) => (
                    <tr key={record.dispensationId}>
                      <td className="p-3 text-xs">{new Date(record.dispensedAt).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-gray-900">
                        {record.patientName} <span className="text-gray-400 text-xs">({record.patientId})</span>
                      </td>
                      <td className="p-3">{record.medicineName}</td>
                      <td className="p-3 font-bold text-lime-900">{record.quantity}</td>
                      <td className="p-3 font-mono text-xs">{record.prescriptionId}</td>
                      <td className="p-3 text-xs text-gray-600">{record.dispensedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {showMedicineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-lime-600" />
                Add Pharmacy Medicine Item
              </h3>
              <button
                type="button"
                onClick={() => setShowMedicineModal(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={medicineForm.departmentId}
                  onChange={(e) => setMedicineForm({ ...medicineForm, departmentId: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                >
                  <option value="">None / General Formulary</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName} ({dept.departmentId})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Select the clinical or dispensing department.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Azithromycin 250mg"
                  value={medicineForm.name}
                  onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category / Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Antibiotic, Analgesic, Cardiovascular"
                  value={medicineForm.category}
                  onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit Price ($/LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="25.00"
                    value={medicineForm.price}
                    onChange={(e) => setMedicineForm({ ...medicineForm, price: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="100"
                    value={medicineForm.stockQuantity}
                    onChange={(e) => setMedicineForm({ ...medicineForm, stockQuantity: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-lime-50 rounded-2xl border border-lime-200 text-xs text-lime-900">
                <strong>Medicine ID:</strong> Auto-incremented business identifier (e.g. <code>MED-00001X</code>).
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMedicineModal(false)}
                  className="rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-[#142008] hover:bg-lime-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function eligiblePrescriptionItemsFor(medicine, prescriptions) {
  return prescriptions.some((prescription) =>
    (prescription.items || []).some(
      (item) => item.medicineId === medicine.medicineId && item.remainingQuantity > 0
    )
  );
}
