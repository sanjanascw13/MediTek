import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Microscope, Plus } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const initialTest = { patientId: '', doctorId: '', testType: '' };

export default function LabsPage() {
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activeTab, setActiveTab] = useState('TESTS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOrder, setShowOrder] = useState(false);
  const [order, setOrder] = useState(initialTest);
  const [resultTest, setResultTest] = useState(null);
  const [summary, setSummary] = useState('');
  const [resultClassification, setResultClassification] = useState('NORMAL');
  const [reviewingDoctorId, setReviewingDoctorId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const role = api.getCurrentRole();
      const testList = await api.getLaboratoryTests();
      const [patientList, doctorList] = role === 'PATIENT'
        ? [[await api.getCurrentPatient()].filter(Boolean), []]
        : await Promise.all([
            api.getPatients().catch(() => []),
            api.getDoctors().catch(() => []),
          ]);
      setTests(Array.isArray(testList) ? testList : []);
      setPatients(Array.isArray(patientList) ? patientList : []);
      setDoctors(Array.isArray(doctorList) ? doctorList : []);
      const currentDoctor = (doctorList || []).find((doctor) => doctor?.personId === api.getCurrentUser()?.personId);
      setOrder((current) => ({
        ...current,
        patientId: current.patientId || patientList[0]?.patientId || '',
        doctorId: current.doctorId || currentDoctor?.doctorId || doctorList[0]?.doctorId || '',
      }));
      setReviewingDoctorId((current) => current || currentDoctor?.doctorId || doctorList[0]?.doctorId || '');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load laboratory records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patientName = (id) => (patients || []).find((item) => item?.personId === id || item?.patientId === id)?.name || id;
  const doctorName = (id) => (doctors || []).find((item) => item?.personId === id || item?.doctorId === id)?.name || id;
  const role = api.getCurrentRole();
  const isAdministrator = role === 'ADMIN';
  const isDoctor = role === 'DOCTOR';
  const currentDoctorId = (doctors || []).find((doctor) => doctor?.personId === api.getCurrentUser()?.personId)?.doctorId;
  const orderTest = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createLaboratoryTest({
        ...order,
        doctorId: order.doctorId,
      });
      setTests((current) => [created, ...current]);
      setShowOrder(false);
      setOrder({
        patientId: patients[0]?.patientId || '',
        doctorId: order.doctorId,
        testType: '',
      });
      setSuccess(api.isMockMode()
        ? `Demo test ${created.testId} ordered. This record is local demo data only.`
        : `Laboratory test ${created.testId} ordered.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to create a demo test order.'));
    } finally {
      setSaving(false);
    }
  };
  const completeTest = async (event) => {
    event.preventDefault();
    if (!resultTest) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.publishLaboratoryReport(
        resultTest.testId,
        summary,
        resultClassification,
        reviewingDoctorId
      );
      setTests((current) => current.map((item) => item.testId === updated.testId
        ? { ...item, status: 'COMPLETED', reportId: updated.reportId, summary: updated.summary, result: updated.result }
        : item));
      setSuccess(api.isMockMode() ? `Demo result ${updated.reportId} recorded.` : `Laboratory report ${updated.reportId} recorded.`);
      setResultTest(null);
      setSummary('');
      setResultClassification('NORMAL');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to record demo result.'));
    } finally {
      setSaving(false);
    }
  };
  const cancelTest = async (test) => {
    setError('');
    setSuccess('');
    try {
      const updated = await api.cancelLaboratoryTest(test.testId);
      setTests((current) => current.map((item) => item.testId === updated.testId ? updated : item));
      setSuccess(`Laboratory test ${updated.testId} cancelled.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to cancel laboratory test.'));
    }
  };
  const visibleTests = activeTab === 'REPORTS'
    ? tests.filter((test) => test.status === 'COMPLETED')
    : tests;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-black text-gray-900">Clinical Pathology & Diagnostic Laboratory</h1><p className="text-sm text-gray-500">Laboratory diagnostic investigations, orders and reports</p></div>
        {(isAdministrator || isDoctor) && <button onClick={() => setShowOrder(true)} disabled={!patients.length || !doctors.length} className="inline-flex items-center gap-2 rounded-2xl bg-[#a3e635] px-5 py-2.5 text-sm font-bold text-gray-900 disabled:opacity-50"><Plus className="h-4 w-4" />Order test</button>}
      </header>
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      <div className="flex gap-2"><button onClick={() => setActiveTab('TESTS')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'TESTS' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>Ordered tests</button><button onClick={() => setActiveTab('REPORTS')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'REPORTS' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>Completed reports</button></div>
      {loading ? <LoadingState label="Loading laboratory records..." /> : visibleTests.length === 0 ? <EmptyState>No {activeTab === 'REPORTS' ? 'completed reports' : 'test orders'} are available.</EmptyState> : (
        <div className="space-y-4">
          {visibleTests.map((test) => (
            <article key={test.testId} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Microscope className="h-4 w-4 text-lime-800" /><span className="font-mono text-xs font-bold text-lime-800">{test.testId}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${test.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{test.status}</span></div>
                  <h2 className="font-bold text-gray-900">{test.testType}</h2>
                  <p className="text-sm text-gray-600">Patient: <strong>{patientName(test.patientPersonId)}</strong> · Ordered by: {doctorName(test.orderedByPersonId)}</p>
                  <p className="text-xs text-gray-500">Requested {new Date(test.requestedAt).toLocaleString()}</p>
                  {test.summary && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700"><FileText className="mr-1 inline h-4 w-4" />Report {test.reportId} ({test.result}): {test.summary}</p>}
                </div>
                <div className="flex gap-2">
                  {test.status === 'PENDING' && (['ADMIN', 'STAFF'].includes(role) || (isDoctor && test.orderedByPersonId === currentDoctorId)) && <button onClick={() => { setResultTest(test); setSummary(''); setResultClassification('NORMAL'); }} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white">{api.isMockMode() ? 'Record demo result' : 'Record result'}</button>}
                  {!api.isMockMode() && test.status === 'PENDING' && ['ADMIN', 'STAFF'].includes(role) && <button onClick={() => cancelTest(test)} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700">Cancel</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {showOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={orderTest} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{api.isMockMode() ? 'Order a demo test' : 'Order laboratory test'}</h2><label className="block text-sm font-semibold">Patient<select required value={order.patientId} onChange={(event) => setOrder({ ...order, patientId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.personId} value={patient.patientId}>{patient.name} ({patient.patientId})</option>)}</select></label>{isAdministrator && <label className="block text-sm font-semibold">Ordering Doctor<select required value={order.doctorId} onChange={(event) => setOrder({ ...order, doctorId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select Doctor</option>{doctors.map((doctor) => <option key={doctor.personId} value={doctor.doctorId}>{doctor.name} ({doctor.doctorId})</option>)}</select></label>}<label className="block text-sm font-semibold">Test name<input required maxLength={128} value={order.testType} onChange={(event) => setOrder({ ...order, testType: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowOrder(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold">{saving ? 'Saving…' : api.isMockMode() ? 'Create demo order' : 'Create order'}</button></div></form></div>}
      {resultTest && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={completeTest} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{api.isMockMode() ? 'Record demo report' : 'Record laboratory report'}</h2><p className="text-sm text-gray-600">{resultTest.testType} · {patientName(resultTest.patientPersonId)}</p><label className="block text-sm font-semibold">Result summary<textarea required maxLength={4000} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><label className="block text-sm font-semibold">Classification<select required value={resultClassification} onChange={(event) => setResultClassification(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="NORMAL">Normal</option><option value="ABNORMAL">Abnormal</option></select></label><label className="block text-sm font-semibold">Reviewing Doctor<select required disabled={isDoctor} value={isDoctor ? currentDoctorId || '' : reviewingDoctorId} onChange={(event) => setReviewingDoctorId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select reviewing Doctor</option>{doctors.map((doctor) => <option key={doctor.personId} value={doctor.doctorId}>{doctor.name} ({doctor.doctorId})</option>)}</select></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setResultTest(null)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving || (!isDoctor && !reviewingDoctorId)} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">{saving ? 'Saving…' : api.isMockMode() ? 'Save demo report' : 'Save report'}</button></div></form></div>}
    </div>
  );
}
