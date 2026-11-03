import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Bed, Plus } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState, UnavailableNotice } from '../components/ApiState';

export default function WardsBedsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
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
  const [form, setForm] = useState({
    patientPersonId: '',
    wardId: '',
    bedId: '',
    admittingDoctorPersonId: '',
    reason: '',
    targetWardId: '',
    targetBedId: '',
  });
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
      ]);
      const [admissionsResult, patientsResult, doctorsResult, wardsResult, bedsResult] = results;
      if (admissionsResult.status === 'fulfilled') {
        setAdmissions(admissionsResult.value);
      }
      const patientList = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
      const doctorList = doctorsResult.status === 'fulfilled' ? doctorsResult.value : [];
      setPatients(patientList);
      setDoctors(doctorList);
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
      .then((beds) => {
        if (!cancelled) setAvailableBeds(beds);
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
        if (!availableBeds.some((bed) => bed.bedId === form.bedId)) {
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
        if (!availableBeds.some((bed) => bed.bedId === form.targetBedId)) {
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

  if (!api.isMockMode() && !api.isModuleAvailable('admissions')) {
    return <UnavailableNotice module="Inpatient admissions" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Inpatient Admissions & Transfers</h2>
          <p className="text-sm text-gray-500">Active admissions with ward and operational bed selection.</p>
        </div>
        <button onClick={openAdmit} disabled={!eligiblePatients.length || !doctors.length || !wards.length} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm shadow-md disabled:opacity-50">
          <Plus className="w-4 h-4" /> Admit Patient
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Only operationally AVAILABLE beds without an active admission can be selected. Occupancy is derived from active admissions.</p>
      </div>
      {wardsError && <ErrorState message={wardsError} onRetry={loadData} />}
      {bedsError && <ErrorState message={bedsError} onRetry={loadData} />}
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}
      {loading ? <LoadingState label="Loading active admissions..." /> : admissions.length === 0 ? (
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
                    <p className="flex items-center gap-1 font-semibold text-gray-800"><Bed className="h-3.5 w-3.5" />{admission.bedNumber || admission.bedId}</p>
                    <p className="text-xs text-gray-500">{admission.wardName || 'Ward not specified'}</p>
                  </td>
                  <td className="p-4 text-gray-700">{admission.admittingDoctorName || admission.admittingDoctorPersonId}</td>
                  <td className="p-4 text-xs text-gray-600">{admission.admissionDate ? new Date(admission.admissionDate).toLocaleString() : '—'}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openTransfer(admission)} disabled={!wards.length} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><ArrowRightLeft className="mr-1 inline h-3.5 w-3.5" />Transfer</button>
                      <button onClick={() => handleDischarge(admission)} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Discharge</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div><h2 className="text-lg font-bold text-gray-900">Ward and bed inventory</h2><p className="text-xs text-gray-500">Occupancy is derived from active admissions; operational status comes from each bed record.</p></div>
          {beds.length === 0 ? <EmptyState>No bed inventory records are available.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400"><th className="p-3">Ward</th><th className="p-3">Bed</th><th className="p-3">Operational status</th><th className="p-3">Admission occupancy</th></tr></thead>
                <tbody className="divide-y divide-gray-50">{beds.map((bed) => {
                  const ward = wards.find((item) => item.wardId === bed.wardId);
                  const isOccupied = occupiedBedIds.has(bed.bedId);
                  return <tr key={bed.bedId}><td className="p-3">{ward?.wardName || bed.wardId}</td><td className="p-3 font-semibold">{bed.bedNumber} <span className="font-mono text-xs text-gray-500">({bed.bedId})</span></td><td className="p-3">{bed.operationalStatus}</td><td className="p-3">{isOccupied ? 'Occupied by active admission' : bed.operationalStatus === 'AVAILABLE' ? 'Available' : 'Not selectable'}</td></tr>;
                })}</tbody>
              </table>
            </div>
          )}
      </section>

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
                      {wards.map((ward) => <option key={ward.wardId} value={ward.wardId}>{ward.wardName}</option>)}
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
                      {wards.map((ward) => <option key={ward.wardId} value={ward.wardId}>{ward.wardName}</option>)}
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
