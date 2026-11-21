import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Microscope,
  FlaskConical,
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
  Stethoscope,
  Send,
  AlertCircle,
  FileCheck,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';
import { EmptyState, ErrorState, LoadingState } from '../ApiState';

export default function LabWorkerDashboard() {
  const user = api.getCurrentUser();
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Tab state
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED' | 'URGENT'
  const [searchQuery, setSearchQuery] = useState('');

  // Results Entry Modal state
  const [selectedTest, setSelectedTest] = useState(null);
  const [resultClassification, setResultClassification] = useState('NORMAL');
  const [reviewingDoctorId, setReviewingDoctorId] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Report View Modal state
  const [viewingReport, setViewingReport] = useState(null);

  // Quick Order Modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderPatientId, setOrderPatientId] = useState('');
  const [orderDoctorId, setOrderDoctorId] = useState('');
  const [orderTestType, setOrderTestType] = useState('Full Blood Count (FBC)');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const loadLabWorkspace = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [allTests, patList, docList] = await Promise.all([
        api.getLaboratoryTests().catch(() => []),
        api.getPatients().catch(() => []),
        api.getDoctors().catch(() => []),
      ]);

      setTests(Array.isArray(allTests) ? allTests : []);
      setPatients(Array.isArray(patList) ? patList : []);
      setDoctors(Array.isArray(docList) ? docList : []);

      if (docList && docList.length > 0 && !reviewingDoctorId) {
        setReviewingDoctorId(docList[0].doctorId || 'DOC-000001');
      }
      if (patList && patList.length > 0 && !orderPatientId) {
        setOrderPatientId(patList[0].patientId || patList[0].personId || '');
      }
      if (docList && docList.length > 0 && !orderDoctorId) {
        setOrderDoctorId(docList[0].doctorId || 'DOC-000001');
      }
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load laboratory workspace.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewingDoctorId, orderPatientId, orderDoctorId]);

  useEffect(() => {
    loadLabWorkspace();
  }, [loadLabWorkspace]);

  // Handle open result entry modal
  const handleOpenResultModal = (test) => {
    setSelectedTest(test);
    setResultClassification('NORMAL');

    // Default reviewing doctor to ordering doctor if valid, or first doctor
    const matchedDoctor = doctors.find(
      (d) => d.doctorId === test.doctorId || d.personId === test.doctorId || d.name === test.doctorName
    );
    setReviewingDoctorId(matchedDoctor?.doctorId || test.doctorId || doctors[0]?.doctorId || 'DOC-000001');

    // Pre-populate test result template based on test name
    const testName = (test.testType || test.testName || '').toLowerCase();
    if (testName.includes('blood count') || testName.includes('fbc') || testName.includes('cbc')) {
      setResultDetails(
        'Hemoglobin: 13.8 g/dL (Ref: 12.0 - 15.5)\n' +
        'WBC Count: 6,800 /uL (Ref: 4,500 - 11,000)\n' +
        'Platelet Count: 245,000 /uL (Ref: 150,000 - 450,000)\n' +
        'Hematocrit: 41.5% (Ref: 37.0 - 48.0)\n' +
        'Technician Remarks: Specimen evaluated. Normocytic normochromic red cell picture. No atypical cells observed.'
      );
    } else if (testName.includes('glucose') || testName.includes('fbs') || testName.includes('sugar')) {
      setResultDetails(
        'Fasting Blood Glucose: 92 mg/dL (Ref: 70 - 99 mg/dL Normal, 100-125 Impaired)\n' +
        'Technician Remarks: Plasma glucose within normal physiological limits.'
      );
    } else if (testName.includes('lipid')) {
      setResultDetails(
        'Total Cholesterol: 185 mg/dL (Desirable: < 200)\n' +
        'Triglycerides: 140 mg/dL (Normal: < 150)\n' +
        'HDL Cholesterol: 52 mg/dL (Optimal: > 40)\n' +
        'LDL Cholesterol: 105 mg/dL (Optimal: < 100)\n' +
        'Technician Remarks: Lipid panel within acceptable cardiovascular risk bounds.'
      );
    } else if (testName.includes('urine')) {
      setResultDetails(
        'Color: Pale Yellow, Clear\n' +
        'Specific Gravity: 1.018\n' +
        'pH: 6.2\n' +
        'Protein: Negative\n' +
        'Glucose: Negative\n' +
        'Pus Cells: 1 - 2 / hpf\n' +
        'RBC: Nil\n' +
        'Technician Remarks: Normal urinary findings. No signs of active infection.'
      );
    } else {
      setResultDetails(
        `Diagnostic test "${test.testType || test.testName}" completed.\n` +
        'Specimen collected and analyzed according to clinical pathology protocol.\n' +
        'Findings: All primary evaluated parameters within standard biological reference ranges.'
      );
    }
  };

  // Submit and finalize report
  const handlePublishReport = async (e) => {
    e.preventDefault();
    if (!selectedTest) return;
    if (!resultDetails.trim()) {
      setError('Please provide diagnostic test findings or remarks.');
      return;
    }

    setSubmittingReport(true);
    setError('');
    try {
      const testId = selectedTest.testId || selectedTest.id;
      await api.publishLaboratoryReport(
        testId,
        resultDetails.trim(),
        resultClassification,
        reviewingDoctorId || 'DOC-000001'
      );

      setSuccessMsg(`Diagnostic report for test ${testId} finalized and published successfully! Result available to attending physician.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setSelectedTest(null);
      setResultDetails('');
      // Reload tests
      await loadLabWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to publish laboratory report.'));
    } finally {
      setSubmittingReport(false);
    }
  };

  // Handle Quick Order Submission
  const handleQuickOrder = async (e) => {
    e.preventDefault();
    if (!orderPatientId) {
      setError('Select a registered patient.');
      return;
    }

    setSubmittingOrder(true);
    setError('');
    try {
      await api.createLaboratoryTest({
        patientId: orderPatientId,
        doctorId: orderDoctorId || 'DOC-000001',
        testType: orderTestType,
      });

      setSuccessMsg(`Test order "${orderTestType}" registered in laboratory queue.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setShowOrderModal(false);
      await loadLabWorkspace(true);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to register test order.'));
    } finally {
      setSubmittingOrder(false);
    }
  };

  // KPI Calculations
  const pendingTests = tests.filter((t) => t.status === 'PENDING' || t.status === 'REQUESTED');
  const completedTests = tests.filter((t) => t.status === 'COMPLETED');
  const urgentTests = tests.filter((t) => t.priority === 'URGENT' || (t.notes && t.notes.toLowerCase().includes('urgent')));

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Status filter
      if (activeFilter === 'PENDING' && test.status !== 'PENDING' && test.status !== 'REQUESTED') return false;
      if (activeFilter === 'COMPLETED' && test.status !== 'COMPLETED') return false;
      if (activeFilter === 'URGENT' && test.priority !== 'URGENT' && (!test.notes || !test.notes.toLowerCase().includes('urgent'))) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const testName = (test.testType || test.testName || '').toLowerCase();
        const patName = (test.patientName || test.patientId || '').toLowerCase();
        const docName = (test.doctorName || test.doctorId || '').toLowerCase();
        const testId = (test.testId || test.id || '').toLowerCase();
        return testName.includes(q) || patName.includes(q) || docName.includes(q) || testId.includes(q);
      }
      return true;
    });
  }, [tests, activeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200">
            <Microscope className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                Central Pathology Laboratory
              </span>
              <span className="text-xs text-gray-500">
                Diagnostic Services & Specimen Analysis
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              Welcome, {user?.name || 'Robert Chen'}
            </h1>
            <p className="text-xs text-gray-500">
              Diagnostic test queue, specimen verification, and lab report publishing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLabWorkspace(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            title="Refresh worklist"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-purple-700' : 'text-gray-500'}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            New Lab Order
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <ErrorState message={error} onRetry={() => loadLabWorkspace()} />}
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Orders</p>
              <p className="mt-1 text-2xl font-black text-amber-600">{pendingTests.length}</p>
              <p className="mt-0.5 text-xs text-gray-400">Awaiting specimen / entry</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Urgent / STAT</p>
              <p className="mt-1 text-2xl font-black text-red-600">{urgentTests.length}</p>
              <p className="mt-0.5 text-xs text-red-500">Immediate priority</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Reports</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">{completedTests.length}</p>
              <p className="mt-0.5 text-xs text-gray-400">Published to Doctor & Portal</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tests</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{tests.length}</p>
              <p className="mt-0.5 text-xs text-purple-700">Central Pathology Archive</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
              <FlaskConical className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Worklist Container */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Tests ({tests.length})
            </button>
            <button
              onClick={() => setActiveFilter('PENDING')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending Entry ({pendingTests.length})
            </button>
            <button
              onClick={() => setActiveFilter('URGENT')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeFilter === 'URGENT'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Urgent / STAT ({urgentTests.length})
            </button>
            <button
              onClick={() => setActiveFilter('COMPLETED')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed ({completedTests.length})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, doctor, or test..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Worklist Table */}
        {loading ? (
          <LoadingState label="Loading laboratory test worklist..." />
        ) : filteredTests.length === 0 ? (
          <EmptyState>No laboratory test requests matching current filter criteria.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Test Name & ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Ordering Doctor</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Bench Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredTests.map((test) => {
                  const isUrgent = test.priority === 'URGENT' || (test.notes && test.notes.toLowerCase().includes('urgent'));
                  const isPending = test.status === 'PENDING' || test.status === 'REQUESTED';

                  return (
                    <tr
                      key={test.testId || test.id}
                      className={`transition ${isUrgent && isPending ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50/70'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{test.testType || test.testName || 'Diagnostic Test'}</span>
                          {isUrgent && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 animate-pulse">
                              STAT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">Order ID: {test.testId || test.id}</p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">{test.patientName || 'Patient'}</p>
                        <span className="text-xs text-gray-400">ID: {test.patientId || test.patientPersonId}</span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">{test.doctorName || 'Attending Physician'}</p>
                        <span className="text-xs text-gray-400">{test.doctorId || 'DOC-000001'}</span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isUrgent ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {test.priority || (isUrgent ? 'URGENT' : 'ROUTINE')}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          test.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {test.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenResultModal(test)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 shadow-purple-200"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                            Enter Findings
                          </button>
                        ) : (
                          <button
                            onClick={() => setViewingReport(test)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                            View Report
                          </button>
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

      {/* DIAGNOSTIC RESULTS ENTRY MODAL */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-50 p-2.5 text-purple-700">
                  <Microscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Input Diagnostic Findings & Publish Report
                  </h3>
                  <p className="text-xs text-gray-500">
                    Test: {selectedTest.testType || selectedTest.testName} (Order: {selectedTest.testId || selectedTest.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Test Context Card */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-2xl bg-purple-50/50 p-4 text-xs">
              <div>
                <span className="text-gray-500">Patient:</span>
                <p className="font-bold text-gray-900">{selectedTest.patientName || 'Patient'}</p>
                <p className="text-[11px] text-gray-400">ID: {selectedTest.patientId || selectedTest.patientPersonId}</p>
              </div>
              <div>
                <span className="text-gray-500">Ordering Doctor:</span>
                <p className="font-bold text-gray-900">{selectedTest.doctorName || 'Physician'}</p>
                <p className="text-[11px] text-gray-400">ID: {selectedTest.doctorId || 'DOC-000001'}</p>
              </div>
              <div>
                <span className="text-gray-500">Clinical Indication:</span>
                <p className="font-semibold text-gray-700 italic">
                  {selectedTest.notes || 'Routine diagnostic evaluation'}
                </p>
              </div>
            </div>

            <form onSubmit={handlePublishReport} className="space-y-4">
              {/* Result Classification */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Diagnostic Result Classification
                </label>
                <div className="mt-1.5 flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <input
                      type="radio"
                      name="classification"
                      value="NORMAL"
                      checked={resultClassification === 'NORMAL'}
                      onChange={() => setResultClassification('NORMAL')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    NORMAL (Within Reference Bounds)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-red-800 cursor-pointer rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <input
                      type="radio"
                      name="classification"
                      value="ABNORMAL"
                      checked={resultClassification === 'ABNORMAL'}
                      onChange={() => setResultClassification('ABNORMAL')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    ABNORMAL (Requires Physician Attention)
                  </label>
                </div>
              </div>

              {/* Reviewing Doctor Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Reviewing / Verifying Pathologist
                </label>
                <select
                  value={reviewingDoctorId}
                  onChange={(e) => setReviewingDoctorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId || d.personId} value={d.doctorId || d.personId}>
                      {d.name} ({d.doctorId || d.personId}) — {d.specialization || 'Clinical Reviewer'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Findings & Test Metrics Textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Laboratory Findings, Metrics & Technician Remarks
                </label>
                <textarea
                  rows={6}
                  value={resultDetails}
                  onChange={(e) => setResultDetails(e.target.value)}
                  placeholder="Enter quantitative laboratory values, normal reference intervals, and technician remarks..."
                  className="mt-1 w-full font-mono rounded-xl border border-gray-200 p-3 text-xs leading-relaxed focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                ℹ️ Publishing this report will mark order <strong>{selectedTest.testId || selectedTest.id}</strong> as <strong>COMPLETED</strong> and make the diagnostic findings immediately viewable to the attending physician and patient portal.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTest(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submittingReport ? 'Publishing Report...' : 'Sign & Finalize Laboratory Report'}
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
                <h3 className="text-lg font-bold text-gray-900">
                  {viewingReport.testType || viewingReport.testName || 'Diagnostic Report'}
                </h3>
                <p className="text-xs text-gray-500">
                  Patient: {viewingReport.patientName || viewingReport.patientId} • ID: {viewingReport.testId || viewingReport.id}
                </p>
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
                <span className="text-gray-500">Diagnostic Status:</span>
                <span className="font-bold text-emerald-700">COMPLETED & VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ordering Physician:</span>
                <span className="font-semibold text-gray-800">{viewingReport.doctorName || 'Dr. Gregory House'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Classification:</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[10px]">
                  {viewingReport.result || 'NORMAL'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Pathologist / Technician Report Summary
              </span>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs font-mono leading-relaxed text-gray-800 whitespace-pre-wrap">
                {viewingReport.summary || viewingReport.reportSummary || 'All parameters evaluated and within standard physiological ranges.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingReport(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LAB ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Register New Lab Test Order</h3>
                <p className="text-xs text-gray-500">Central Pathology Laboratory Intake</p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Select Patient
                </label>
                <select
                  value={orderPatientId}
                  onChange={(e) => setOrderPatientId(e.target.value)}
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
                  Attending Doctor
                </label>
                <select
                  value={orderDoctorId}
                  onChange={(e) => setOrderDoctorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId || d.personId} value={d.doctorId || d.personId}>
                      {d.name} ({d.doctorId || d.personId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Diagnostic Test Name
                </label>
                <select
                  value={orderTestType}
                  onChange={(e) => setOrderTestType(e.target.value)}
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

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {submittingOrder ? 'Registering...' : 'Register Test Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

