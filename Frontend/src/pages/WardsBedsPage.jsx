import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Bed,
  BedDouble,
  Building2,
  CheckCircle,
  Plus,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState, UnavailableNotice } from '../components/ApiState';

const WARD_TYPES = [
  'GENERAL',
  'ICU',
  'SURGICAL',
  'MATERNITY',
  'CARDIOLOGY',
  'PEDIATRIC',
  'ORTHOPEDIC',
  'EMERGENCY',
];

export default function WardsBedsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bedLoading, setBedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [wardsError, setWardsError] = useState('');
  const [bedsError, setBedsError] = useState('');
  const [bedError, setBedError] = useState('');
  const [success, setSuccess] = useState('');
  const [formMode, setFormMode] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  // Facility management modal states (Super Admin & Admin)
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardForm, setWardForm] = useState({
    wardName: '',
    wardType: 'GENERAL',
    departmentId: '',
  });

  const [showBedModal, setShowBedModal] = useState(false);
  const [bedForm, setBedForm] = useState({
    departmentId: '',
    wardId: '',
    bedNumber: '',
  });

  const [form, setForm] = useState({
    patientPersonId: '',
    wardId: '',
    bedId: '',
    admittingDoctorPersonId: '',
    reason: '',
    targetWardId: '',
    targetBedId: '',
  });

  const role = api.getCurrentRole();
  const canManageFacilities = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  const selectedWardId = formMode === 'transfer' ? form.targetWardId : form.wardId;
  const activePatientIds = new Set(admissions.map((admission) => admission.patientPersonId));
  const occupiedBedIds = new Set(admissions.map((admission) => admission.bedId));
  const eligiblePatients = patients.filter((patient) => !activePatientIds.has(patient.personId));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.getActiveAdmissions(),
        api.getPatients(),
        api.getDoctors(),
        api.getWards(),
        api.getBeds(),
        api.getDepartments(),
      ]);
      const [admissionsResult, patientsResult, doctorsResult, wardsResult, bedsResult, departmentsResult] = results;
      if (admissionsResult.status === 'fulfilled') {
        setAdmissions(admissionsResult.value);
      }
      const patientList = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
      const doctorList = doctorsResult.status === 'fulfilled' ? doctorsResult.value : [];
      setPatients(patientList);
      setDoctors(doctorList);

      const deptList = departmentsResult.status === 'fulfilled' && Array.isArray(departmentsResult.value)
        ? departmentsResult.value
        : [];
      setDepartments(deptList);

      const wardArray = wardsResult.status === 'fulfilled' && Array.isArray(wardsResult.value) ? wardsResult.value : [];
      if (wardsResult.status === 'fulfilled') {
        setWards(wardArray);
        setWardsError('');
      } else {
        setWards([]);
        setWardsError(api.getErrorMessage(wardsResult.reason, 'Unable to load wards.'));
      }
      if (bedsResult.status === 'fulfilled') {
        setBeds(Array.isArray(bedsResult.value) ? bedsResult.value : []);
        setBedsError('');
      } else {
        setBeds([]);
        setBedsError(api.getErrorMessage(bedsResult.reason, 'Unable to load bed inventory.'));
      }

      setForm((current) => ({
        ...current,
        patientPersonId: current.patientPersonId || patientList[0]?.personId || '',
        admittingDoctorPersonId: current.admittingDoctorPersonId || doctorList[0]?.personId || '',
        wardId: current.wardId || wardArray[0]?.wardId || '',
      }));

      setWardForm((current) => ({
        ...current,
        departmentId: current.departmentId || deptList[0]?.departmentId || '',
      }));

      setBedForm((current) => ({
        ...current,
        departmentId: current.departmentId || deptList[0]?.departmentId || '',
        wardId: current.wardId || wardArray[0]?.wardId || '',
      }));

      const failed = results.slice(0, 3).filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        setError(failed.map((result) => api.getErrorMessage(result.reason, 'Unable to load admission data.')).join(' '));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedWardId) {
      setAvailableBeds([]);
      setBedError('');
      setBedLoading(false);
      return undefined;
    }
    let cancelled = false;
    setAvailableBeds([]);
    setBedError('');
    setBedLoading(true);
    api.getAvailableBeds(selectedWardId)
      .then((bedsData) => {
        if (!cancelled) {
          const list = Array.isArray(bedsData) ? bedsData : [];
          setAvailableBeds(list);
          if (list.length > 0) {
            setForm((current) => ({
              ...current,
              bedId: current.bedId && list.some((b) => b.bedId === current.bedId) ? current.bedId : list[0].bedId,
              targetBedId: current.targetBedId && list.some((b) => b.bedId === current.targetBedId) ? current.targetBedId : list[0].bedId,
            }));
          }
        }
      })
      .catch((requestError) => {
        if (!cancelled) setBedError(api.getErrorMessage(requestError, 'Unable to load available beds.'));
      })
      .finally(() => {
        if (!cancelled) setBedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWardId, admissions]);

  const openAdmit = () => {
    setSelectedAdmission(null);
    setForm((current) => ({
      ...current,
      patientPersonId: (eligiblePatients || [])[0]?.personId || '',
      wardId: current.wardId || (wards || [])[0]?.wardId || '',
      bedId: '',
      reason: '',
    }));
    setFormMode('admit');
  };

  const openTransfer = (admission) => {
    setSelectedAdmission(admission);
    setForm((current) => ({
      ...current,
      targetWardId: admission.wardId || '',
      targetBedId: '',
      reason: admission.reason || '',
    }));
    setFormMode('transfer');
  };

  const closeForm = () => {
    setFormMode('');
    setSelectedAdmission(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (formMode === 'admit') {
        if (!availableBeds.some((b) => b.bedId === form.bedId)) {
          throw new Error('Choose an available bed from the selected ward before admitting this patient.');
        }
        const created = await api.admitPatient({
          patientPersonId: form.patientPersonId,
          wardId: form.wardId,
          bedId: form.bedId,
          admittingDoctorPersonId: form.admittingDoctorPersonId,
          reason: form.reason.trim(),
        });
        setAdmissions((current) => [created, ...current]);
        setSuccess(`Admission ${created.admissionId} created.`);
      } else if (formMode === 'transfer' && selectedAdmission) {
        if (!availableBeds.some((b) => b.bedId === form.targetBedId)) {
          throw new Error('Choose an available bed from the selected ward before transferring this patient.');
        }
        const created = await api.transferAdmission(
          selectedAdmission.admissionId,
          form.targetBedId.trim(),
          form.reason.trim()
        );
        setAdmissions((current) => [
          created,
          ...current.filter((item) => item.admissionId !== selectedAdmission.admissionId),
        ]);
        setSuccess(`Transfer completed. New admission: ${created.admissionId}.`);
      }
      closeForm();
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to complete admission operation.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDischarge = async (admission) => {
    setError('');
    setSuccess('');
    try {
      await api.dischargeAdmission(admission.admissionId);
      setAdmissions((current) => current.filter((item) => item.admissionId !== admission.admissionId));
      setSuccess(`Admission ${admission.admissionId} discharged.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to discharge patient.'));
    }
  };

  // Add Ward Handler
  const handleCreateWard = async (e) => {
    e.preventDefault();
    if (!wardForm.wardName.trim()) {
      setError('Ward name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createWard({
        wardName: wardForm.wardName.trim(),
        wardType: wardForm.wardType,
        departmentId: wardForm.departmentId || null,
      });
      setSuccess(`Ward "${created.wardName}" (${created.wardId}) added successfully.`);
      setShowWardModal(false);
      setWardForm({
        wardName: '',
        wardType: 'GENERAL',
        departmentId: departments[0]?.departmentId || '',
      });
      await loadData();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to create ward.'));
    } finally {
      setSaving(false);
    }
  };

  // Add Bed Handler
  const handleCreateBed = async (e) => {
    e.preventDefault();
    if (!bedForm.wardId) {
      setError('Please select a target ward.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        wardId: bedForm.wardId,
        bedNumber: bedForm.bedNumber.trim() || undefined,
      };
      const created = await api.createBed(payload);
      setSuccess(`Bed ${created.bedNumber} (${created.bedId}) added to ${created.wardName || 'ward'} successfully.`);
      setShowBedModal(false);
      setBedForm((current) => ({
        ...current,
        bedNumber: '',
      }));
      await loadData();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to create bed.'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered wards for bed creation modal if department is chosen
  const filteredWardsForBed = bedForm.departmentId
    ? wards.filter((w) => !w.departmentId || w.departmentId === bedForm.departmentId)
    : wards;

  if (!api.isMockMode() && !api.isModuleAvailable('admissions')) {
    return <UnavailableNotice module="Inpatient admissions" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Inpatient Admissions & Facility Management</h2>
          <p className="text-sm text-gray-500">Manage hospital wards, bed inventory, and active patient admissions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageFacilities && (
            <>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowWardModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-900 text-white font-bold text-xs sm:text-sm hover:bg-gray-800 transition-all shadow-sm"
              >
                <Building2 className="w-4 h-4 text-lime-400" />
                Add Ward
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowBedModal(true);
                }}
                disabled={!wards.length}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-900 text-white font-bold text-xs sm:text-sm hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50"
              >
                <BedDouble className="w-4 h-4 text-lime-400" />
                Add Bed
              </button>
            </>
          )}

          <button
            type="button"
            onClick={openAdmit}
            disabled={!eligiblePatients.length || !doctors.length || !wards.length}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs sm:text-sm shadow-md hover:bg-lime-400 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Admit Patient
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Only operationally AVAILABLE beds without an active admission can be selected. Occupancy is derived from active admissions.</p>
      </div>

      {wardsError && <ErrorState message={wardsError} onRetry={loadData} />}
      {bedsError && <ErrorState message={bedsError} onRetry={loadData} />}
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          {success}
        </div>
      )}

      {/* Active Admissions Table */}
      {loading ? (
        <LoadingState label="Loading active admissions..." />
      ) : admissions.length === 0 ? (
        <EmptyState>No active inpatient admissions.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4">Admission</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Bed / Ward</th>
                <th className="p-4">Admitting Doctor</th>
                <th className="p-4">Admitted</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admissions.map((admission) => (
                <tr key={admission.admissionId} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs font-bold text-lime-800">{admission.admissionId}</td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-900">{admission.patientName || admission.patientPersonId}</p>
                    <p className="text-xs text-gray-500">{admission.patientPersonId}</p>
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1 font-semibold text-gray-800">
                      <Bed className="h-3.5 w-3.5" />
                      {admission.bedNumber || admission.bedId}
                    </p>
                    <p className="text-xs text-gray-500">{admission.wardName || 'Ward not specified'}</p>
                  </td>
                  <td className="p-4 text-gray-700">{admission.admittingDoctorName || admission.admittingDoctorPersonId}</td>
                  <td className="p-4 text-xs text-gray-600">
                    {admission.admissionDate ? new Date(admission.admissionDate).toLocaleString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openTransfer(admission)}
                        disabled={!wards.length}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ArrowRightLeft className="mr-1 inline h-3.5 w-3.5" />
                        Transfer
                      </button>
                      <button
                        onClick={() => handleDischarge(admission)}
                        className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Discharge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hospital Wards Overview Section */}
      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-lime-700" />
              Hospital Wards & Clinical Units
            </h3>
            <p className="text-xs text-gray-500">Configured wards with assigned clinical departments and bed capacities.</p>
          </div>
          <span className="text-xs font-medium text-gray-500">{wards.length} ward(s)</span>
        </div>

        {wards.length === 0 ? (
          <EmptyState>No wards configured in the active database.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wards.map((ward) => (
              <div key={ward.wardId} className="p-5 rounded-2xl border border-gray-100 hover:border-lime-300 transition-all bg-gradient-to-br from-white to-gray-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{ward.wardName}</h4>
                    <p className="text-xs font-mono text-gray-400">{ward.wardId}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                    {ward.wardType}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-gray-500">
                    Department:{' '}
                    <span className="font-semibold text-gray-800">
                      {ward.departmentName || 'General Facility'}
                    </span>
                  </p>
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-[11px]">
                    <span className="text-gray-600">Total: <strong className="text-gray-900">{ward.totalBeds}</strong></span>
                    <span className="text-emerald-700">Available: <strong className="text-emerald-800">{ward.availableBeds}</strong></span>
                    <span className="text-amber-700">Occupied: <strong className="text-amber-800">{ward.occupiedBeds}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bed Inventory Section */}
      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-lime-700" />
              Bed Inventory & Real-Time Availability
            </h3>
            <p className="text-xs text-gray-500">Auto-increment bed records, department alignment, and operational states.</p>
          </div>
          <span className="text-xs font-medium text-gray-500">{beds.length} bed(s) registered</span>
        </div>

        {beds.length === 0 ? (
          <EmptyState>No bed inventory records are available.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="p-3">Bed ID</th>
                  <th className="p-3">Bed Number</th>
                  <th className="p-3">Ward</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Operational Status</th>
                  <th className="p-3">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {beds.map((bed) => {
                  const ward = wards.find((item) => item.wardId === bed.wardId);
                  const isOccupied = occupiedBedIds.has(bed.bedId);
                  const deptName = bed.departmentName || ward?.departmentName || 'General Care';
                  return (
                    <tr key={bed.bedId} className="hover:bg-gray-50/70">
                      <td className="p-3 font-mono text-xs font-bold text-gray-600">{bed.bedId}</td>
                      <td className="p-3 font-semibold text-gray-900">{bed.bedNumber}</td>
                      <td className="p-3 text-gray-800">{bed.wardName || ward?.wardName || bed.wardId}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          {deptName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          bed.operationalStatus === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bed.operationalStatus === 'MAINTENANCE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {bed.operationalStatus}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {isOccupied ? (
                          <span className="font-semibold text-amber-700">Occupied ({bed.currentPatientName || 'Patient'})</span>
                        ) : bed.operationalStatus === 'AVAILABLE' ? (
                          <span className="font-semibold text-emerald-700">Ready for Admission</span>
                        ) : (
                          <span className="text-gray-400">Not selectable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Add Ward */}
      {showWardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-lime-600" />
                Add New Hospital Ward
              </h3>
              <button
                type="button"
                onClick={() => setShowWardModal(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={wardForm.departmentId}
                  onChange={(e) => setWardForm({ ...wardForm, departmentId: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                >
                  <option value="">None / General Hospital</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName} ({dept.departmentId})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Select the clinical department managing this ward.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ward Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology Care Ward"
                  value={wardForm.wardName}
                  onChange={(e) => setWardForm({ ...wardForm, wardName: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ward Type
                </label>
                <select
                  value={wardForm.wardType}
                  onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                >
                  {WARD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-lime-50 rounded-2xl border border-lime-200 text-xs text-lime-900">
                <strong>Ward ID:</strong> Auto-generated by backend counter (e.g. <code>WRD-00000X</code>).
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWardModal(false)}
                  className="rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-[#142008] hover:bg-lime-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bed */}
      {showBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-lime-600" />
                Add New Bed to Ward
              </h3>
              <button
                type="button"
                onClick={() => setShowBedModal(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBed} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department (Filter)
                </label>
                <select
                  value={bedForm.departmentId}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    const matchingWards = deptId
                      ? wards.filter((w) => !w.departmentId || w.departmentId === deptId)
                      : wards;
                    setBedForm({
                      ...bedForm,
                      departmentId: deptId,
                      wardId: matchingWards[0]?.wardId || '',
                    });
                  }}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Ward *
                </label>
                <select
                  required
                  value={bedForm.wardId}
                  onChange={(e) => setBedForm({ ...bedForm, wardId: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                >
                  <option value="">Select Ward</option>
                  {filteredWardsForBed.map((ward) => (
                    <option key={ward.wardId} value={ward.wardId}>
                      {ward.wardName} ({ward.wardId}) {ward.departmentName ? `— ${ward.departmentName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bed Number / Room Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate (e.g. B-01)"
                  value={bedForm.bedNumber}
                  onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:ring-2 focus:ring-lime-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  If left blank, the bed number will be automatically incremented for this ward.
                </p>
              </div>

              <div className="p-3 bg-lime-50 rounded-2xl border border-lime-200 text-xs text-lime-900">
                <strong>Bed ID:</strong> Auto-incremented business identifier (e.g. <code>BED-00000X</code>).
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBedModal(false)}
                  className="rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !bedForm.wardId}
                  className="rounded-2xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-[#142008] hover:bg-lime-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admit or Transfer Patient */}
      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">{formMode === 'admit' ? 'Admit Patient' : 'Transfer Admission'}</h3>
            {formMode === 'transfer' && <p className="mt-1 text-xs text-gray-500">Current admission: {selectedAdmission?.admissionId}</p>}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formMode === 'admit' && (
                <>
                  <label className="block text-xs font-semibold text-gray-700">Patient
                    <select required value={form.patientPersonId} onChange={(event) => setForm({ ...form, patientPersonId: event.target.value })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      {eligiblePatients.map((patient) => <option key={patient.personId} value={patient.personId}>{patient.name} ({patient.patientId})</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">Admitting doctor
                    <select required value={form.admittingDoctorPersonId} onChange={(event) => setForm({ ...form, admittingDoctorPersonId: event.target.value })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      {doctors.map((doctor) => <option key={doctor.personId} value={doctor.personId}>{doctor.name} ({doctor.doctorId})</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">Ward
                    <select required disabled={loading || Boolean(wardsError) || !wards.length} value={form.wardId} onChange={(event) => setForm({ ...form, wardId: event.target.value, bedId: '' })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      <option value="">{loading ? 'Loading wards...' : wardsError ? 'Ward list unavailable' : 'Select a ward'}</option>
                      {wards.map((ward) => (
                        <option key={ward.wardId} value={ward.wardId}>
                          {ward.wardName} {ward.departmentName ? `(${ward.departmentName})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {wardsError && <p className="text-xs text-rose-700">Unable to load wards: {wardsError}</p>}
                  {!wardsError && !loading && wards.length === 0 && <p className="text-xs text-gray-500">No wards are available in the active data source.</p>}
                  <label className="block text-xs font-semibold text-gray-700">Available bed
                    <select required disabled={!form.wardId || bedLoading || Boolean(bedError) || availableBeds.length === 0} value={form.bedId} onChange={(event) => setForm({ ...form, bedId: event.target.value })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      <option value="">{bedLoading ? 'Loading available beds...' : bedError ? 'Bed list unavailable' : 'Select an available bed'}</option>
                      {availableBeds.map((bed) => <option key={bed.bedId} value={bed.bedId}>{bed.bedNumber} ({bed.bedId})</option>)}
                    </select>
                  </label>
                  {bedError && <ErrorState message={bedError} />}
                  {!bedLoading && !bedError && form.wardId && availableBeds.length === 0 && (
                    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No available beds in the selected ward. Choose another ward or try again after a bed is available.</p>
                  )}
                </>
              )}
              {formMode === 'transfer' && (
                <>
                  <label className="block text-xs font-semibold text-gray-700">Target ward
                    <select required value={form.targetWardId} onChange={(event) => setForm({ ...form, targetWardId: event.target.value, targetBedId: '' })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      <option value="">Select a ward</option>
                      {wards.map((ward) => (
                        <option key={ward.wardId} value={ward.wardId}>
                          {ward.wardName} {ward.departmentName ? `(${ward.departmentName})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">Available target bed
                    <select required disabled={!form.targetWardId || bedLoading || Boolean(bedError) || availableBeds.length === 0} value={form.targetBedId} onChange={(event) => setForm({ ...form, targetBedId: event.target.value })} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm">
                      <option value="">{bedLoading ? 'Loading available beds...' : bedError ? 'Bed list unavailable' : 'Select an available bed'}</option>
                      {availableBeds.map((bed) => <option key={bed.bedId} value={bed.bedId}>{bed.bedNumber} ({bed.bedId})</option>)}
                    </select>
                  </label>
                  {bedError && <ErrorState message={bedError} />}
                  {!bedLoading && !bedError && form.targetWardId && availableBeds.length === 0 && <p role="status" className="text-sm text-amber-900">No available beds in the selected ward.</p>}
                </>
              )}
              <label className="block text-xs font-semibold text-gray-700">Reason
                <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={2} className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm" />
              </label>
              {error && <ErrorState message={error} />}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeForm} className="rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700">Cancel</button>
                <button type="submit" disabled={saving || bedLoading || Boolean(bedError) || availableBeds.length === 0} className="rounded-2xl bg-[#a3e635] px-5 py-2.5 text-xs font-bold text-[#142008] disabled:opacity-50">{saving ? 'Saving...' : formMode === 'admit' ? 'Admit Patient' : 'Confirm Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
