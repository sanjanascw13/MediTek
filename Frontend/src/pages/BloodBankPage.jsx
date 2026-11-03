import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Droplets, Plus, Search, Syringe } from 'lucide-react';
import { api } from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const components = ['WHOLE_BLOOD', 'RED_CELLS', 'PLASMA', 'PLATELETS', 'CRYOPRECIPITATE'];
const today = () => new Date().toISOString().slice(0, 10);
const emptyUnit = {
  bloodBankId: '',
  bloodType: '',
  component: 'WHOLE_BLOOD',
  quantityMl: '',
  collectionDate: '',
  expirationDate: '',
};

export default function BloodBankPage() {
  const [bloodUnits, setBloodUnits] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [bloodIssues, setBloodIssues] = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [bloodTypeFilter, setBloodTypeFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [bankForm, setBankForm] = useState({ name: '', location: '' });
  const [issueForm, setIssueForm] = useState({ unitId: '', patientId: '', quantityMl: '', purpose: '' });
  const isDemo = api.isMockMode();
  const role = api.getCurrentRole();
  const canManage = ['ADMIN', 'STAFF'].includes(role);
  const canConfigureBank = role === 'ADMIN';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        ...(bloodTypeFilter ? { bloodType: bloodTypeFilter } : {}),
        ...(componentFilter ? { component: componentFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };
      const [banks, units, issues, patientList] = await Promise.all([
        api.getBloodBanks(),
        api.getBloodUnits(filters),
        api.getBloodIssues(),
        canManage ? api.getPatients() : Promise.resolve([]),
      ]);
      setBloodBanks(banks);
      setBloodUnits(units);
      setBloodIssues(issues);
      setPatients(patientList);
      setUnitForm((current) => ({ ...current, bloodBankId: current.bloodBankId || banks[0]?.bloodBankId || '' }));
      setIssueForm((current) => ({
        ...current,
        unitId: current.unitId || units.find((unit) => unit.availabilityStatus === 'AVAILABLE')?.unitId || '',
        patientId: current.patientId || patientList[0]?.patientId || '',
      }));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load blood-bank inventory.'));
    } finally {
      setLoading(false);
    }
  }, [bloodTypeFilter, componentFilter, search, canManage]);

  useEffect(() => {
    const timer = setTimeout(loadData, isDemo ? 0 : 250);
    return () => clearTimeout(timer);
  }, [loadData, isDemo]);

  const activeUnits = useMemo(() => bloodUnits.filter((unit) => (
    (unit.availabilityStatus || (unit.expirationDate < today() ? 'EXPIRED' : 'AVAILABLE')) === 'AVAILABLE'
  )), [bloodUnits]);
  const bloodSummary = bloodTypes.map((type) => {
    const units = bloodUnits.filter((unit) => unit.bloodType === type && (
      unit.availabilityStatus ? unit.availabilityStatus === 'AVAILABLE' : unit.expirationDate >= today()
    ));
    const volumeMl = units.reduce((total, unit) => total + Number(unit.quantityMl || 0), 0);
    return { type, batches: units.length, volumeMl, status: units.length === 0 ? 'NO STOCK' : 'AVAILABLE' };
  });

  const addUnit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.addBloodUnit(unitForm);
      setBloodUnits((current) => [created, ...current]);
      setSuccess(`${isDemo ? 'Demo ' : ''}blood batch ${created.unitId} received.`);
      setUnitForm({ ...emptyUnit, bloodBankId: bloodBanks[0]?.bloodBankId || '' });
      setShowUnitForm(false);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to receive blood inventory.'));
    } finally {
      setSaving(false);
    }
  };

  const createBank = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.createBloodBank(bankForm);
      setBloodBanks((current) => [...current, created]);
      setUnitForm((current) => ({ ...current, bloodBankId: created.bloodBankId }));
      setBankForm({ name: '', location: '' });
      setShowBankForm(false);
      setSuccess(`Blood bank ${created.name} added.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to configure blood bank.'));
    } finally {
      setSaving(false);
    }
  };

  const issueUnit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const issue = await api.issueBloodUnit(issueForm);
      setBloodIssues((current) => [issue, ...current]);
      setBloodUnits((current) => current.map((unit) => (
        unit.unitId === issue.unitId
          ? { ...unit, quantityMl: unit.quantityMl - issue.quantityMl,
            availabilityStatus: unit.quantityMl - issue.quantityMl === 0 ? 'DEPLETED' : 'AVAILABLE' }
          : unit
      )));
      setIssueForm((current) => ({ ...current, quantityMl: '', purpose: '' }));
      setShowIssueForm(false);
      setSuccess(`${isDemo ? 'Demo ' : ''}issue ${issue.bloodIssueId} recorded.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to issue blood inventory.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Blood Bank & Hemotherapy Management</h1>
          <p className="text-sm text-gray-500">{isDemo ? 'Demo batches and stock ledger' : 'Batch-level inventory and role-scoped issue history'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button onClick={() => setShowIssueForm(true)} disabled={!activeUnits.length || !patients.length} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50"><Syringe className="h-4 w-4" />Issue volume</button>}
          {canManage && <button onClick={() => setShowUnitForm(true)} disabled={!bloodBanks.length} className="inline-flex items-center gap-2 rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold text-gray-900 disabled:opacity-50"><Plus className="h-4 w-4" />Receive batch</button>}
          {canConfigureBank && <button onClick={() => setShowBankForm(true)} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">Add blood bank</button>}
        </div>
      </header>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        {isDemo
          ? 'Development demo inventory only. These records are not screened or clinically available.'
          : 'Inventory is tracked by blood batch and volume. Issuing only checks recorded blood-group equality, expiry, and available volume; it does not replace screening, crossmatching, or clinician authorization.'}
      </p>
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {bloodBanks.length === 0 && !loading && <p className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{canConfigureBank ? 'Add a blood bank before receiving inventory.' : 'No blood banks are configured. Ask a Super Admin to set one up.'}</p>}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label="Search blood inventory" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch or blood bank" className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm" /></label>
        <select aria-label="Filter blood group" value={bloodTypeFilter} onChange={(event) => setBloodTypeFilter(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">All blood groups</option>{bloodTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <select aria-label="Filter blood component" value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">All components</option>{components.map((component) => <option key={component}>{component}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {bloodSummary.map((item) => (
          <div key={item.type} className={`rounded-2xl border p-3 text-center ${item.status === 'NO STOCK' ? 'border-rose-200 bg-rose-50' : 'border-gray-100 bg-white'}`}>
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-sm font-black text-rose-700">{item.type}</div>
            <p className="text-lg font-extrabold text-gray-900">{item.batches}</p>
            <p className="text-[10px] text-gray-500">batches · {item.volumeMl} ml</p>
            <p className="mt-1 text-[9px] font-bold text-gray-600">{item.status}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Blood batches</h2>
        {loading ? <LoadingState label="Loading blood-bank inventory..." /> : bloodUnits.length === 0 ? <EmptyState>No blood batches match these filters.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-100 text-[11px] uppercase text-gray-400"><th className="pb-3">Batch ID</th><th className="pb-3">Bank</th><th className="pb-3">Group / Component</th><th className="pb-3">Volume</th><th className="pb-3">Collected</th><th className="pb-3">Expires</th><th className="pb-3 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {bloodUnits.map((unit) => {
                  const availability = unit.availabilityStatus || (unit.expirationDate < today() ? 'EXPIRED' : 'AVAILABLE');
                  return <tr key={unit.unitId}>
                    <td className="py-3 font-mono text-xs font-bold text-lime-800">{unit.unitId}</td>
                    <td className="py-3 text-xs">{unit.bloodBank || unit.bloodBankName}</td>
                    <td className="py-3"><span className="font-black text-rose-700">{unit.bloodType}</span><span className="ml-2 text-xs text-gray-500">{(unit.component || 'WHOLE_BLOOD').replaceAll('_', ' ')}</span></td>
                    <td className="py-3 text-xs font-semibold">{unit.quantityMl} ml</td>
                    <td className="py-3 text-xs text-gray-500">{unit.collectionDate}</td>
                    <td className="py-3 text-xs text-gray-500">{unit.expirationDate}</td>
                    <td className="py-3 text-right"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${availability === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{availability}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Issue history</h2>
        {loading ? null : bloodIssues.length === 0 ? <EmptyState>No blood issues are recorded.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-gray-100 text-[11px] uppercase text-gray-400"><th className="pb-3">Issue ID</th><th className="pb-3">Patient</th><th className="pb-3">Batch / group</th><th className="pb-3">Volume</th><th className="pb-3">Issued at</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{bloodIssues.map((issue) => <tr key={issue.bloodIssueId}><td className="py-3 font-mono text-xs">{issue.bloodIssueId}</td><td className="py-3 text-xs">{issue.patientName || issue.patientId}</td><td className="py-3 text-xs">{issue.unitId} · {issue.bloodType}</td><td className="py-3 text-xs">{issue.quantityMl} ml</td><td className="py-3 text-xs text-gray-500">{new Date(issue.issuedAt).toLocaleString()}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      {showUnitForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={addUnit} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{isDemo ? 'Add demo blood batch' : 'Receive blood batch'}</h2>
        <label className="block text-sm font-semibold">Blood bank<select required value={unitForm.bloodBankId} onChange={(event) => setUnitForm({ ...unitForm, bloodBankId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select bank</option>{bloodBanks.map((bank) => <option key={bank.bloodBankId} value={bank.bloodBankId}>{bank.name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Blood group<select required value={unitForm.bloodType} onChange={(event) => setUnitForm({ ...unitForm, bloodType: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select group</option>{bloodTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="block text-sm font-semibold">Component<select required value={unitForm.component} onChange={(event) => setUnitForm({ ...unitForm, component: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal">{components.map((component) => <option key={component}>{component}</option>)}</select></label>
        <label className="block text-sm font-semibold">Volume (ml)<input required type="number" min="1" step="1" value={unitForm.quantityMl} onChange={(event) => setUnitForm({ ...unitForm, quantityMl: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Collection date<input required type="date" max={today()} value={unitForm.collectionDate} onChange={(event) => setUnitForm({ ...unitForm, collectionDate: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Expiration date<input required type="date" min={today()} value={unitForm.expirationDate} onChange={(event) => setUnitForm({ ...unitForm, expirationDate: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUnitForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold">{saving ? 'Saving…' : 'Receive batch'}</button></div>
      </form></div>}

      {showBankForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={createBank} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Configure blood bank</h2><label className="block text-sm font-semibold">Name<input required maxLength={128} value={bankForm.name} onChange={(event) => setBankForm({ ...bankForm, name: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><label className="block text-sm font-semibold">Location<input required maxLength={128} value={bankForm.location} onChange={(event) => setBankForm({ ...bankForm, location: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowBankForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">{saving ? 'Saving…' : 'Create blood bank'}</button></div></form></div>}

      {showIssueForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={issueUnit} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">{isDemo ? 'Record demo issue' : 'Issue blood volume'}</h2><label className="block text-sm font-semibold">Available batch<select required value={issueForm.unitId} onChange={(event) => setIssueForm({ ...issueForm, unitId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select batch</option>{activeUnits.map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.unitId} · {unit.bloodType} {unit.component} · {unit.quantityMl} ml</option>)}</select></label><label className="block text-sm font-semibold">Registered patient<select required value={issueForm.patientId} onChange={(event) => setIssueForm({ ...issueForm, patientId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} ({patient.patientId}) · {patient.bloodGroup}</option>)}</select></label><label className="block text-sm font-semibold">Volume (ml)<input required type="number" min="1" step="1" value={issueForm.quantityMl} onChange={(event) => setIssueForm({ ...issueForm, quantityMl: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><label className="block text-sm font-semibold">Purpose / reference<input maxLength={500} value={issueForm.purpose} onChange={(event) => setIssueForm({ ...issueForm, purpose: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowIssueForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">{saving ? 'Saving…' : 'Record issue'}</button></div></form></div>}
    </div>
  );
}
