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
  Plus,
  Check,
  Play,
  LogOut,
  ChevronRight,
  Activity,
  FilePlus,
  FlaskConical,
  Eye,
  RefreshCw,
  X,
  FileText,
  BedDouble,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { api } from '../../services/api';
import { EmptyState, ErrorState, LoadingState } from '../ApiState';

export default function DoctorClinicalDashboard() {
  const user = api.getCurrentUser();
  const [activeTab, setActiveTab] = useState('consultations'); // 'consultations' | 'inpatients' | 'prescriptions' | 'labs'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Domain data
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);

  // Active consultation state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultNotes, setConsultNotes] = useState({
    chiefComplaint: '',
    diagnosis: '',
    symptoms: '',
    remarks: '',
  });
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Inpatient Discharge Modal state
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [discharging, setDischarging] = useState(false);

  // Prescription Modal state
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxPatientId, setRxPatientId] = useState('');
  const [rxInstructions, setRxInstructions] = useState('Take medications after meals with water.');
  const [rxItems, setRxItems] = useState([
    { medicineId: '', dosage: '500mg', frequency: 'Twice daily', durationDays: 5, prescribedQuantity: 10 },
  ]);
  const [submittingRx, setSubmittingRx] = useState(false);
  const [rxCompleteConsultation, setRxCompleteConsultation] = useState(true);

  // Lab Order Modal state
  const [showLabModal, setShowLabModal] = useState(false);
  const [labPatientId, setLabPatientId] = useState('');
  const [labTestName, setLabTestName] = useState('Full Blood Count (FBC)');
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [labNotes, setLabNotes] = useState('');
  const [submittingLab, setSubmittingLab] = useState(false);

  // Lab Report View Modal state
  const [viewingReport, setViewingReport] = useState(null);

  // Filter query
  const [searchQuery, setSearchQuery] = useState('');

  const loadDoctorWorkspace = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [allApts, activeAdms, allRx, allLabs, medList, patList] = await Promise.all([
        api.getAppointments().catch(() => []),
        api.getActiveAdmissions().catch(() => []),
        api.getPrescriptions().catch(() => []),
        api.getLaboratoryTests().catch(() => []),
        api.getMedicines().catch(() => []),
        api.getPatients().catch(() => []),
      ]);

      // Filter appointments assigned to this doctor
      const myApts = (allApts || []).filter((apt) => (
        apt.doctorPersonId === user?.personId ||
        apt.doctorName === user?.name ||
        apt.doctorId === user?.doctorId
      ));
      setAppointments(myApts);

      // Inpatients assigned to this doctor
      const myAdmissions = (activeAdms || []).filter((adm) => (
        adm.admittingDoctorPersonId === user?.personId ||
        adm.admittingDoctorName === user?.name ||
        !adm.admittingDoctorPersonId // Fallback for demo shared views
      ));
      setAdmissions(myAdmissions);

      // Prescriptions issued by this doctor
      const myRx = (allRx || []).filter((rx) => (
        rx.doctorPersonId === user?.personId ||
        rx.doctorId === user?.personId ||
        rx.doctorName === user?.name
      ));
      setPrescriptions(myRx.length > 0 ? myRx : (allRx || []));

      // Lab tests
      setLabTests(allLabs || []);
      setMedicines(medList || []);
      setPatients(patList || []);

      // Auto-select first scheduled or in-progress appointment if none selected
      if (!selectedAppointment && myApts.length > 0) {
        const activeOne = myApts.find((a) => a.status === 'IN_PROGRESS') ||
                          myApts.find((a) => a.status === 'SCHEDULED') ||
                          myApts[0];
        setSelectedAppointment(activeOne);
        setConsultNotes({
          chiefComplaint: activeOne.notes || 'Routine consultation',
          diagnosis: '',
          symptoms: '',
          remarks: '',
        });
      }
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load doctor workspace.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.personId, user?.name, user?.doctorId, selectedAppointment]);

  useEffect(() => {
    loadDoctorWorkspace();
  }, []);

  // Update appointment status (Start / Complete consultation)
  const handleUpdateAppointmentStatus = async (status) => {
    if (!selectedAppointment) return;
    setStatusUpdating(true);
    setError('');
    try {
      const aptId = selectedAppointment.appointmentId || selectedAppointment.id;
      await api.updateAppointmentStatus(aptId, status);
      setSuccessMsg(`Appointment status updated to ${status}.`);
      setTimeout(() => setSuccessMsg(''), 4000);

      // Update in local state
      setAppointments((prev) =>
        prev.map((a) => ((a.appointmentId || a.id) === aptId ? { ...a, status } : a))
      );
      setSelectedAppointment((prev) => (prev ? { ...prev, status } : null));
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to update consultation status.'));
    } finally {
      setStatusUpdating(false);
    }
  };

  // Authorize Patient Discharge
  const handleDischargePatient = async () => {
    if (!dischargeTarget) return;
    setDischarging(true);
    setError('');
    try {
      await api.dischargeAdmission(dischargeTarget.admissionId);
      setSuccessMsg(`Patient ${dischargeTarget.patientName || 'Inpatient'} has been discharged successfully. Bed ${dischargeTarget.bedNumber || ''} is now available.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setDischargeTarget(null);
      setDischargeNotes('');
      // Reload active admissions
      const updatedAdmissions = await api.getActiveAdmissions().catch(() => []);
      setAdmissions(updatedAdmissions);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to discharge patient. Please verify hospital records.'));
    } finally {
      setDischarging(false);
    }
  };

  // Issue E-Prescription
  const handleOpenRxModal = (targetPatientId) => {
    const defaultPat = patients.find((p) => p.personId === targetPatientId || p.patientId === targetPatientId) ||
                       patients.find((p) => p.personId === selectedAppointment?.patientPersonId) ||
                       patients[0];
    const resolvedPatId = defaultPat?.patientId || defaultPat?.personId || targetPatientId || '';
    setRxPatientId(resolvedPatId);
    setRxCompleteConsultation(selectedAppointment?.status === 'SCHEDULED');
    if (consultNotes.remarks?.trim()) {
      setRxInstructions(consultNotes.remarks.trim());
    } else {
      setRxInstructions('Take medications after meals with water.');
    }
    if (medicines.length > 0 && rxItems[0].medicineId === '') {
      setRxItems([{ medicineId: medicines[0].medicineId, dosage: '500mg', frequency: 'Twice daily', durationDays: 5, prescribedQuantity: 10 }]);
    }
    setShowRxModal(true);
  };

  const handleAddRxItem = () => {
    setRxItems((prev) => [
      ...prev,
      { medicineId: medicines[0]?.medicineId || '', dosage: '500mg', frequency: 'Twice daily', durationDays: 5, prescribedQuantity: 10 },
    ]);
  };

  const handleRemoveRxItem = (index) => {
    setRxItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRxItemChange = (index, field, value) => {
    setRxItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    if (!rxPatientId) {
      setError('Please select a patient for the prescription.');
      return;
    }
    if (rxItems.length === 0 || rxItems.some((i) => !i.medicineId)) {
      setError('Please specify at least one medication.');
      return;
    }

    setSubmittingRx(true);
    setError('');
    try {
      const payload = {
        patientId: rxPatientId,
        doctorId: user?.doctorId || 'DOC-000001',
        instructions: rxInstructions,
        items: rxItems.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          frequency: item.frequency,
          durationDays: parseInt(item.durationDays, 10) || 5,
          prescribedQuantity: parseInt(item.prescribedQuantity, 10) || 10,
        })),
      };

      await api.createPrescription(payload);

      let consultationCompletedNote = '';
      if (rxCompleteConsultation && selectedAppointment && selectedAppointment.status === 'SCHEDULED') {
        const isMatch = (selectedAppointment.patientPersonId === rxPatientId || selectedAppointment.patientId === rxPatientId);
        if (isMatch) {
          const aptId = selectedAppointment.appointmentId || selectedAppointment.id;
          try {
            await api.updateAppointmentStatus(aptId, 'COMPLETED');
            setAppointments((prev) =>
              prev.map((a) => ((a.appointmentId || a.id) === aptId ? { ...a, status: 'COMPLETED' } : a))
            );
            setSelectedAppointment((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
            consultationCompletedNote = ' Consultation marked as completed.';
          } catch (statusErr) {
            console.warn('Could not auto-complete appointment:', statusErr);
          }
        }
      }

      setSuccessMsg(`Prescription successfully issued and transmitted to the Central Pharmacy dispensing queue!${consultationCompletedNote}`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowRxModal(false);
      // Reload prescriptions
      const rxList = await api.getPrescriptions().catch(() => []);
      setPrescriptions(rxList || []);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to issue prescription.'));
    } finally {
      setSubmittingRx(false);
    }
  };

  // Order Lab Test
  const handleOpenLabModal = (targetPatientId) => {
    const defaultPat = patients.find((p) => p.personId === targetPatientId || p.patientId === targetPatientId) ||
                       patients.find((p) => p.personId === selectedAppointment?.patientPersonId) ||
                       patients[0];
    setLabPatientId(defaultPat?.patientId || defaultPat?.personId || targetPatientId || '');
    setShowLabModal(true);
  };

  const handleSubmitLabOrder = async (e) => {
    e.preventDefault();
    if (!labPatientId) {
      setError('Please select a patient for the lab test.');
      return;
    }

    setSubmittingLab(true);
    setError('');
    try {
      const payload = {
        patientId: labPatientId,
        doctorId: user?.doctorId || 'DOC-000001',
        testType: labTestName,
        priority: labPriority,
        notes: labNotes || 'Diagnostic evaluation by attending physician',
      };

      await api.createLaboratoryTest(payload);
      setSuccessMsg(`Lab test "${labTestName}" ordered successfully and routed to Central Pathology Laboratory!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowLabModal(false);
      setLabNotes('');
      // Reload lab tests
      const updatedLabs = await api.getLaboratoryTests().catch(() => []);
      setLabTests(updatedLabs || []);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to submit lab test order.'));
    } finally {
      setSubmittingLab(false);
    }
  };

  // Helper stats
  const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const inProgressCount = appointments.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const pendingLabsCount = labTests.filter((l) => l.status === 'PENDING' || l.status === 'REQUESTED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-lime-600 to-emerald-500 text-white shadow-md shadow-lime-200">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-800">
                Doctor Clinical Desk
              </span>
              <span className="text-xs text-gray-500">
                {user?.specialization || 'Attending Physician'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              Welcome, {user?.name || 'Dr. Gregory House'}
            </h1>
            <p className="text-xs text-gray-500">
              Consultations, e-prescribing, inpatient rounds, and patient discharge.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDoctorWorkspace(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            title="Refresh workspace"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-lime-700' : 'text-gray-500'}`} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenRxModal()}
            className="flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-lime-700"
          >
            <Pill className="h-4 w-4" />
            Write Prescription
          </button>
          <button
            onClick={() => handleOpenLabModal()}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800"
          >
            <FlaskConical className="h-4 w-4" />
            Order Lab Test
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <ErrorState message={error} onRetry={() => loadDoctorWorkspace()} />}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consultation Queue</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{scheduledCount}</p>
              <p className="mt-0.5 text-xs text-emerald-600">{completedCount} completed today</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <CalendarDays className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Inpatients</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{admissions.length}</p>
              <p className="mt-0.5 text-xs text-blue-600">Admitted under your care</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <BedDouble className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescriptions</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{prescriptions.length}</p>
              <p className="mt-0.5 text-xs text-lime-700">Sent to Central Pharmacy</p>
            </div>
            <div className="rounded-2xl bg-lime-50 p-3 text-lime-700">
              <Pill className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lab Orders</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{labTests.length}</p>
              <p className="mt-0.5 text-xs text-purple-600">{pendingLabsCount} pending pathology</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
              <FlaskConical className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('consultations')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'consultations'
              ? 'bg-lime-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Consultations & Examination Desk
          {scheduledCount > 0 && (
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === 'consultations' ? 'bg-white text-lime-700' : 'bg-lime-100 text-lime-800'}`}>
              {scheduledCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inpatients')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'inpatients'
              ? 'bg-lime-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BedDouble className="h-4 w-4" />
          Inpatient Care & Discharge
          {admissions.length > 0 && (
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === 'inpatients' ? 'bg-white text-lime-700' : 'bg-blue-100 text-blue-800'}`}>
              {admissions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'prescriptions'
              ? 'bg-lime-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Pill className="h-4 w-4" />
          Issued Prescriptions
        </button>

        <button
          onClick={() => setActiveTab('labs')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            activeTab === 'labs'
              ? 'bg-lime-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Diagnostic Lab Orders
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <LoadingState label="Loading clinical records and patient queues..." />
      ) : (
        <>
          {/* TAB 1: CONSULTATIONS & CLINICAL DESK */}
          {activeTab === 'consultations' && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Today's Queue */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Patient Queue</h2>
                      <p className="text-xs text-gray-500">Select a patient to begin or resume consultation</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {appointments.length} total
                    </span>
                  </div>

                  {appointments.length === 0 ? (
                    <EmptyState>No appointments currently scheduled for your profile.</EmptyState>
                  ) : (
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {appointments.map((apt) => {
                        const isSelected = (selectedAppointment?.appointmentId || selectedAppointment?.id) === (apt.appointmentId || apt.id);
                        const statusColors = {
                          SCHEDULED: 'bg-amber-100 text-amber-800 border-amber-200',
                          IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
                          COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                          CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
                        };

                        return (
                          <div
                            key={apt.appointmentId || apt.id}
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setConsultNotes((prev) => ({
                                ...prev,
                                chiefComplaint: apt.notes || 'Routine consultation',
                              }));
                            }}
                            className={`cursor-pointer rounded-2xl border p-4 transition ${
                              isSelected
                                ? 'border-lime-500 bg-lime-50/50 shadow-sm ring-2 ring-lime-500/20'
                                : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-gray-900">{apt.patientName || 'Patient'}</p>
                                <p className="text-xs text-gray-500">{apt.notes || 'Consultation'}</p>
                              </div>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusColors[apt.status] || 'bg-gray-100 text-gray-700'}`}>
                                {apt.status}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString() : 'Today'}
                              </span>
                              <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-lime-700' : 'text-gray-400'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Consultation Desk */}
              <div className="space-y-4 lg:col-span-7">
                {selectedAppointment ? (
                  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                    {/* Header with patient info and status action */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-gray-900">
                            {selectedAppointment.patientName || 'Consultation Examination'}
                          </h2>
                          <span className="text-xs text-gray-400">
                            (ID: {selectedAppointment.patientPersonId || 'PAT'})
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Scheduled: {selectedAppointment.appointmentDate ? new Date(selectedAppointment.appointmentDate).toLocaleString() : 'Today'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedAppointment.status === 'SCHEDULED' ? (
                          <>
                            <span className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              In Consultation
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateAppointmentStatus('COMPLETED')}
                              disabled={statusUpdating}
                              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 active:scale-95"
                            >
                              <Check className="h-4 w-4" />
                              {statusUpdating ? 'Completing...' : 'Complete Consultation'}
                            </button>
                          </>
                        ) : selectedAppointment.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Consultation Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200">
                            {selectedAppointment.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Patient Health Indicators */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl bg-gray-50 p-4 text-xs">
                      <div>
                        <span className="text-gray-400">Vitals / BP</span>
                        <p className="font-bold text-gray-800">120/80 mmHg</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Heart Rate</span>
                        <p className="font-bold text-gray-800">72 bpm</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Blood Group</span>
                        <p className="font-bold text-gray-800">O+ (Rh Positive)</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Allergies</span>
                        <p className="font-bold text-amber-700">None Recorded</p>
                      </div>
                    </div>

                    {/* Clinical Findings & Diagnosis Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Chief Complaint & Symptoms
                        </label>
                        <input
                          type="text"
                          value={consultNotes.chiefComplaint}
                          onChange={(e) => setConsultNotes({ ...consultNotes, chiefComplaint: e.target.value })}
                          placeholder="e.g. Recurrent headaches, nausea, elevated fatigue"
                          className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-lime-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Clinical Diagnosis
                        </label>
                        <input
                          type="text"
                          value={consultNotes.diagnosis}
                          onChange={(e) => setConsultNotes({ ...consultNotes, diagnosis: e.target.value })}
                          placeholder="e.g. Mild tension migraine with dehydration"
                          className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-lime-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Clinical Notes & Physician Advice
                        </label>
                        <textarea
                          rows={3}
                          value={consultNotes.remarks}
                          onChange={(e) => setConsultNotes({ ...consultNotes, remarks: e.target.value })}
                          placeholder="Advised adequate hydration, rest, and follow-up in 10 days if symptoms persist."
                          className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:border-lime-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Integrated Clinical Direct Actions */}
                    <div className="rounded-2xl border border-lime-100 bg-lime-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-lime-900 uppercase tracking-wide">
                            Connected Care Actions for this Patient
                          </p>
                          <p className="mt-0.5 text-xs text-lime-700">
                            Orders placed here immediately synchronize with the Pharmacy and Laboratory teams.
                          </p>
                        </div>
                        {selectedAppointment.status === 'SCHEDULED' && (
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            Prescribing can auto-complete this visit
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenRxModal(selectedAppointment.patientPersonId)}
                          className="flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-lime-700 active:scale-95"
                        >
                          <Pill className="h-4 w-4" />
                          Prescribe Medicine
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenLabModal(selectedAppointment.patientPersonId)}
                          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800 active:scale-95"
                        >
                          <FlaskConical className="h-4 w-4" />
                          Order Lab Test
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
                    <Stethoscope className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-3 text-base font-bold text-gray-700">No Patient Selected</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Choose an appointment from the queue to start or view examination details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INPATIENT CARE & PATIENT DISCHARGE */}
          {activeTab === 'inpatients' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-blue-600" />
                    Inpatient Care & Discharge Authority
                  </h2>
                  <p className="text-xs text-gray-500">
                    Active hospital admissions under your clinical supervision. You have the authority to authorize patient discharge and release ward beds.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                  {admissions.length} active inpatients
                </span>
              </div>

              {admissions.length === 0 ? (
                <EmptyState>No patients are currently admitted under your care.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Ward & Bed</th>
                        <th className="px-4 py-3">Admission Date</th>
                        <th className="px-4 py-3">Clinical Condition / Reason</th>
                        <th className="px-4 py-3 text-right">Discharge Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {admissions.map((adm) => (
                        <tr key={adm.admissionId} className="hover:bg-gray-50/70 transition">
                          <td className="px-4 py-4">
                            <p className="font-bold text-gray-900">{adm.patientName || 'Inpatient'}</p>
                            <span className="text-xs text-gray-400">ID: {adm.patientPersonId || '—'}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                              <BedDouble className="h-3.5 w-3.5" />
                              {adm.wardName || 'General Ward'} — {adm.bedNumber || adm.bedId}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-600">
                            {adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-600 max-w-xs">
                            {adm.reason || 'Medical observation and inpatient treatment'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => setDischargeTarget(adm)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 shadow-sm"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Discharge Patient
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ISSUED PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-lime-600" />
                    Doctor Prescription Log
                  </h2>
                  <p className="text-xs text-gray-500">
                    Electronic prescriptions issued to patients and dispatched to the Central Pharmacy.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenRxModal()}
                  className="flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-lime-700"
                >
                  <Plus className="h-4 w-4" />
                  New Prescription
                </button>
              </div>

              {prescriptions.length === 0 ? (
                <EmptyState>No prescriptions have been issued yet.</EmptyState>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.prescriptionId || rx.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-gray-200/60 pb-3">
                        <div>
                          <p className="font-bold text-gray-900">{rx.patientName || 'Patient'}</p>
                          <p className="text-xs text-gray-400">Rx ID: {rx.prescriptionId || rx.id}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          rx.status === 'DISPENSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rx.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold text-gray-700">Prescribed Items:</p>
                        {(rx.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between rounded-lg bg-white p-2 border border-gray-100">
                            <span className="font-medium text-gray-800">{item.medicineName || item.medicineId}</span>
                            <span className="text-gray-500">{item.dosage} • {item.frequency} ({item.durationDays || 5} days)</span>
                          </div>
                        ))}
                      </div>

                      {rx.instructions && (
                        <p className="text-xs italic text-gray-500">
                          Instructions: {rx.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIAGNOSTIC LAB ORDERS */}
          {activeTab === 'labs' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-purple-600" />
                    Diagnostic Laboratory Orders & Reports
                  </h2>
                  <p className="text-xs text-gray-500">
                    Clinical lab test requests processed by the Central Pathology Laboratory.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenLabModal()}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4" />
                  Order Lab Investigation
                </button>
              </div>

              {labTests.length === 0 ? (
                <EmptyState>No lab tests ordered yet.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Test Name / ID</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Result Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {labTests.map((test) => {
                        const statusColors = {
                          PENDING: 'bg-amber-100 text-amber-800',
                          REQUESTED: 'bg-amber-100 text-amber-800',
                          IN_PROGRESS: 'bg-blue-100 text-blue-800',
                          COMPLETED: 'bg-emerald-100 text-emerald-800',
                          CANCELLED: 'bg-gray-100 text-gray-600',
                        };

                        return (
                          <tr key={test.testId || test.id} className="hover:bg-gray-50/70 transition">
                            <td className="px-4 py-4">
                              <p className="font-bold text-gray-900">{test.testType || test.testName || 'Diagnostic Panel'}</p>
                              <span className="text-xs text-gray-400">ID: {test.testId || test.id}</span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-800">{test.patientName || 'Patient'}</p>
                              <span className="text-xs text-gray-400">{test.patientId || test.patientPersonId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                test.priority === 'URGENT'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {test.priority || 'ROUTINE'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[test.status] || 'bg-gray-100 text-gray-700'}`}>
                                {test.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {test.status === 'COMPLETED' ? (
                                <button
                                  onClick={() => setViewingReport(test)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View Findings
                                </button>
                              ) : (
                                <span className="text-xs italic text-gray-400">Awaiting specimen</span>
                              )}
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
        </>
      )}

      {/* DISCHARGE CONFIRMATION MODAL */}
      {dischargeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-50 p-2.5 text-red-600">
                  <LogOut className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Authorize Patient Discharge</h3>
                  <p className="text-xs text-gray-500">Physician Clinical Discharge Clearance</p>
                </div>
              </div>
              <button
                onClick={() => setDischargeTarget(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient:</span>
                <span className="font-bold text-gray-900">{dischargeTarget.patientName || 'Inpatient'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bed Allocation:</span>
                <span className="font-bold text-blue-700">{dischargeTarget.wardName || 'Ward'} — {dischargeTarget.bedNumber || dischargeTarget.bedId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Admitted Condition:</span>
                <span className="text-gray-700">{dischargeTarget.reason || 'Medical Observation'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Discharge Summary & Home Care Advice
              </label>
              <textarea
                rows={3}
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Patient vitals stabilized. Discharge cleared with oral medication regimen and outpatient follow-up in two weeks."
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ Authorizing discharge will finalize this admission record and immediately release Bed <strong>{dischargeTarget.bedNumber || dischargeTarget.bedId}</strong> for reception and new admissions.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDischargeTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDischargePatient}
                disabled={discharging}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-200 hover:bg-red-700 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {discharging ? 'Processing Discharge...' : 'Confirm & Authorize Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-PRESCRIPTION MODAL */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-lime-50 p-2.5 text-lime-700">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Issue Electronic Prescription</h3>
                  <p className="text-xs text-gray-500">Transmits directly to Central Pharmacy dispensing</p>
                </div>
              </div>
              <button
                onClick={() => setShowRxModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Patient
                </label>
                <select
                  value={rxPatientId}
                  onChange={(e) => setRxPatientId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-lime-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((pat) => (
                    <option key={pat.patientId || pat.personId} value={pat.patientId || pat.personId}>
                      {pat.name} ({pat.patientId || pat.personId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Medication Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Medications & Dosage
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRxItem}
                    className="flex items-center gap-1 text-xs font-bold text-lime-700 hover:text-lime-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Another Medicine
                  </button>
                </div>

                {rxItems.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-[11px] font-semibold text-gray-500">Medicine</span>
                        <select
                          value={item.medicineId}
                          onChange={(e) => handleRxItemChange(idx, 'medicineId', e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-lime-500 focus:outline-none"
                          required
                        >
                          <option value="">-- Select from Formulary --</option>
                          {medicines.map((m) => (
                            <option key={m.medicineId} value={m.medicineId}>
                              {m.name} ({m.strength || 'Standard'}) - Stock: {m.stockQuantity ?? 100}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-gray-500">Dosage</span>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => handleRxItemChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 500mg or 10ml"
                          className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-lime-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-gray-500">Frequency</span>
                        <input
                          type="text"
                          value={item.frequency}
                          onChange={(e) => handleRxItemChange(idx, 'frequency', e.target.value)}
                          placeholder="Twice daily"
                          className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-lime-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-gray-500">Duration (Days)</span>
                        <input
                          type="number"
                          min="1"
                          value={item.durationDays}
                          onChange={(e) => handleRxItemChange(idx, 'durationDays', e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-lime-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-[11px] font-semibold text-gray-500">Quantity</span>
                          <input
                            type="number"
                            min="1"
                            value={item.prescribedQuantity}
                            onChange={(e) => handleRxItemChange(idx, 'prescribedQuantity', e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-gray-200 p-2 text-xs focus:border-lime-500 focus:outline-none"
                            required
                          />
                        </div>
                        {rxItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRxItem(idx)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Doctor Instructions to Patient
                </label>
                <textarea
                  rows={2}
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="Take after meals. Drink plenty of water."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-lime-500 focus:outline-none"
                />
              </div>

              {/* Auto-Complete consultation option */}
              {selectedAppointment && selectedAppointment.status === 'SCHEDULED' && 
               (selectedAppointment.patientPersonId === rxPatientId || selectedAppointment.patientId === rxPatientId) && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <input
                    type="checkbox"
                    id="rxCompleteConsultation"
                    checked={rxCompleteConsultation}
                    onChange={(e) => setRxCompleteConsultation(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="rxCompleteConsultation" className="text-xs font-semibold text-emerald-900 cursor-pointer select-none">
                    Mark consultation appointment as completed upon issuing this prescription
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRxModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="flex items-center gap-2 rounded-xl bg-lime-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-lime-200 hover:bg-lime-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submittingRx ? 'Transmitting Prescription...' : 'Issue & Transmit Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LAB ORDER MODAL */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-50 p-2.5 text-purple-700">
                  <FlaskConical className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Order Laboratory Investigation</h3>
                  <p className="text-xs text-gray-500">Transfers work order to Central Pathology Lab</p>
                </div>
              </div>
              <button
                onClick={() => setShowLabModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLabOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Patient
                </label>
                <select
                  value={labPatientId}
                  onChange={(e) => setLabPatientId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((pat) => (
                    <option key={pat.patientId || pat.personId} value={pat.patientId || pat.personId}>
                      {pat.name} ({pat.patientId || pat.personId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Diagnostic Test Name
                </label>
                <select
                  value={labTestName}
                  onChange={(e) => setLabTestName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="Full Blood Count (FBC)">Full Blood Count (FBC)</option>
                  <option value="Fasting Blood Glucose (FBS)">Fasting Blood Glucose (FBS)</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="Serum Creatinine & Electrolytes">Serum Creatinine & Electrolytes</option>
                  <option value="Urine Routine Examination">Urine Routine Examination</option>
                  <option value="Chest X-Ray Digital">Chest X-Ray Digital</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Clinical Priority
                </label>
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="ROUTINE"
                      checked={labPriority === 'ROUTINE'}
                      onChange={() => setLabPriority('ROUTINE')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    Routine
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-red-600 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="URGENT"
                      checked={labPriority === 'URGENT'}
                      onChange={() => setLabPriority('URGENT')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    URGENT / STAT
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Clinical Indication / Reason
                </label>
                <textarea
                  rows={2}
                  value={labNotes}
                  onChange={(e) => setLabNotes(e.target.value)}
                  placeholder="Suspected anemia or electrolyte imbalance"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLab}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50"
                >
                  <FlaskConical className="h-4 w-4" />
                  {submittingLab ? 'Submitting Order...' : 'Submit Lab Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LAB REPORT VIEWER MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewingReport.testType || viewingReport.testName}</h3>
                <p className="text-xs text-gray-500">Patient: {viewingReport.patientName || viewingReport.patientId}</p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Test Status:</span>
                <span className="font-bold text-emerald-700">COMPLETED & VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Technician Remarks:</span>
                <span className="font-medium text-gray-800">{viewingReport.reportSummary || 'Specimen evaluated. All parameters within normal reference bounds.'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingReport(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

