import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Receipt, CheckCircle2, Clock, Plus, FileText, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '' });
const displayDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patientId: '', taxRatePercent: '0', items: [emptyLine()] });
  const [selectedBill, setSelectedBill] = useState(null);
  const [lineForm, setLineForm] = useState(emptyLine());
  const [editingLineId, setEditingLineId] = useState('');
  const [editingLine, setEditingLine] = useState(emptyLine());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isPatient = api.getCurrentRole() === 'PATIENT';
      const [billList, patientList] = await Promise.all([
        api.getBills(),
        isPatient ? Promise.resolve([]) : api.getPatients()
      ]);
      setBills(billList);
      setPatients(patientList);
      setForm((current) => ({
        ...current,
        patientId: current.patientId || patientList[0]?.patientId || '',
      }));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load invoices.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter((bill) => (
      `${bill.billId} ${bill.patientId || ''} ${bill.patientName || ''} ${(bill.items || [])
        .map((item) => item.description).join(' ')}`
        .toLowerCase()
        .includes(query)
    ));
  }, [bills, search]);

  const settledRevenue = bills.reduce((sum, bill) => sum + Number(bill.amountPaid || 0), 0);
  const outstandingRevenue = bills.reduce((sum, bill) => sum + Number(bill.balanceDue ?? bill.amountTotal), 0);

  const createInvoice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.createBill({
        patientId: form.patientId,
        taxRatePercent: Number(form.taxRatePercent),
        items: form.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      setBills((current) => [created, ...current]);
      setSuccess(`Invoice ${created.billId} created${api.isMockMode() ? ' in demo mode' : ''}.`);
      setForm((current) => ({ ...current, items: [emptyLine()] }));
      setShowForm(false);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to create invoice.'));
    } finally {
      setSaving(false);
    }
  };

  const updateBill = (updated) => {
    setBills((current) => current.map((bill) => bill.billId === updated.billId ? updated : bill));
    setSelectedBill(updated);
  };

  const addLineItem = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;
    setError('');
    try {
      updateBill(await api.addBillLineItem(selectedBill.billId, {
        ...lineForm,
        quantity: Number(lineForm.quantity),
        unitPrice: Number(lineForm.unitPrice),
      }));
      setLineForm(emptyLine());
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to add invoice item.'));
    }
  };

  const removeLineItem = async (lineItemId) => {
    if (!selectedBill) return;
    setError('');
    try {
      updateBill(await api.removeBillLineItem(selectedBill.billId, lineItemId));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to remove invoice item.'));
    }
  };

  const saveLineItem = async (event) => {
    event.preventDefault();
    if (!selectedBill || !editingLineId) return;
    setError('');
    try {
      updateBill(await api.updateBillLineItem(selectedBill.billId, editingLineId, {
        ...editingLine,
        quantity: Number(editingLine.quantity),
        unitPrice: Number(editingLine.unitPrice),
      }));
      setEditingLineId('');
      setEditingLine(emptyLine());
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update invoice item.'));
    }
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;
    setError('');
    setSuccess('');
    try {
      const paymentRequestId = globalThis.crypto?.randomUUID?.()
        || `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const updated = await api.recordBillPayment(selectedBill.billId, {
        amount: Number(paymentAmount),
        paymentMethod,
        paymentRequestId,
      });
      updateBill(updated);
      setPaymentAmount(String(updated.balanceDue));
      setSuccess(`Payment recorded for invoice ${updated.billId}; no card or gateway was used.`);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to record payment.'));
    }
  };

  const canEditItems = selectedBill?.status === 'PENDING' && Number(selectedBill.amountPaid || 0) === 0;
  const canRecordPayment = selectedBill && ['PENDING', 'PARTIAL'].includes(selectedBill.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Patient Billing</h2>
          <p className="text-sm text-gray-500">Itemized invoices, tax totals, payment history, and outstanding balances.</p>
        </div>
        {!api.getCurrentRole().includes('PATIENT') && (
          <button onClick={() => setShowForm(true)} disabled={!patients.length} className="flex items-center space-x-2 rounded-2xl bg-[#a3e635] px-5 py-2.5 text-sm font-bold text-[#142008] shadow-md transition-all hover:bg-[#91d624] active:scale-95 disabled:opacity-50">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Generate Invoice</span>
          </button>
        )}
      </div>
      {api.isMockMode() && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Development demo invoices only. Payment entries are local records and do not process money or card details.</p>}
      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {loading && <LoadingState label="Loading invoices..." />}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div><p className="text-xs font-semibold text-gray-400">Payments recorded</p><h3 className="mt-1 text-2xl font-black text-gray-900">${settledRevenue.toFixed(2)}</h3></div>
          <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
        </div>
        <div className="flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div><p className="text-xs font-semibold text-gray-400">Outstanding balance</p><h3 className="mt-1 text-2xl font-black text-amber-600">${outstandingRevenue.toFixed(2)}</h3></div>
          <div className="rounded-2xl bg-amber-50 p-3.5 text-amber-600"><Clock className="h-7 w-7" /></div>
        </div>
        <div className="flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div><p className="text-xs font-semibold text-gray-400">Invoices</p><h3 className="mt-1 text-2xl font-black text-lime-800">{bills.length} records</h3></div>
          <div className="rounded-2xl bg-lime-50 p-3.5 text-lime-700"><Receipt className="h-7 w-7" /></div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <label className="mb-4 block max-w-sm text-xs font-semibold text-gray-600">Search invoices
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice, patient, or line item" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="pb-3 pl-2">Invoice</th><th className="pb-3">Patient</th><th className="pb-3">Total</th><th className="pb-3">Paid</th><th className="pb-3">Balance</th><th className="pb-3">Issued</th><th className="pb-3">Status</th><th className="pb-3 pr-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {!loading && visibleBills.length === 0 && <tr><td colSpan="8" className="p-5"><EmptyState>No invoices match this search.</EmptyState></td></tr>}
              {visibleBills.map((bill) => (
                <tr key={bill.billId} className="hover:bg-gray-50/70">
                  <td className="py-3.5 pl-2 font-mono text-xs font-bold text-lime-800">{bill.billId}</td>
                  <td className="py-3.5"><p className="font-bold text-gray-900">{bill.patientName}</p><p className="text-xs text-gray-500">{bill.patientId}</p></td>
                  <td className="py-3.5 font-bold text-gray-900">${Number(bill.amountTotal).toFixed(2)}</td>
                  <td className="py-3.5">${Number(bill.amountPaid || 0).toFixed(2)}</td>
                  <td className="py-3.5 font-semibold">${Number(bill.balanceDue ?? bill.amountTotal).toFixed(2)}</td>
                  <td className="py-3.5 text-xs text-gray-500">{displayDate(bill.issuedAt)}</td>
                  <td className="py-3.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{bill.status}</span></td>
                  <td className="py-3.5 pr-2 text-right"><button type="button" onClick={() => { setSelectedBill(bill); setPaymentAmount(String(bill.balanceDue ?? bill.amountTotal)); setError(''); }} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700"><FileText className="h-3.5 w-3.5" />Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={createInvoice} className="my-6 w-full max-w-2xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Create itemized invoice</h2>
            <label className="block text-sm font-semibold">Patient
              <select required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} ({patient.patientId})</option>)}</select>
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Line items</h3><button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyLine()] }))} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold">Add item</button></div>
              {form.items.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_90px_130px_auto]">
                <input required maxLength={255} aria-label="Item description" placeholder="Description" value={item.description} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, description: event.target.value } : line) }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <input required type="number" min="1" step="1" aria-label="Quantity" placeholder="Qty" value={item.quantity} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line) }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <input required type="number" min="0" step="0.01" aria-label="Unit price" placeholder="Unit price" value={item.unitPrice} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, unitPrice: event.target.value } : line) }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <button type="button" aria-label="Remove item" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, lineIndex) => lineIndex !== index) }))} className="rounded-xl p-2 text-rose-700 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
              </div>)}
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <label className="block max-w-xs text-sm font-semibold">Tax rate (%)
              <input type="number" min="0" max="100" step="0.01" value={form.taxRatePercent} onChange={(event) => setForm({ ...form, taxRatePercent: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 p-3 font-normal" />
            </label>
            <p className="text-xs text-gray-500">Tax is calculated on the sum of line totals and rounded to two decimal places. No currency is assumed.</p>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#a3e635] px-4 py-2 text-sm font-bold">{saving ? 'Saving…' : 'Create invoice'}</button></div>
          </form>
        </div>
      )}

      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <section className="my-6 w-full max-w-2xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{selectedBill.billId}</h2><p className="text-sm text-gray-500">{selectedBill.patientName} · {selectedBill.status}</p></div><button type="button" onClick={() => setSelectedBill(null)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold">Close</button></div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
            <div className="space-y-2">
              <h3 className="font-bold">Invoice items</h3>
              {(selectedBill.items || []).map((item) => editingLineId === item.lineItemId ? (
                <form key={item.lineItemId} onSubmit={saveLineItem} className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1fr_90px_130px_auto_auto]">
                  <input required maxLength={255} aria-label="Edit item description" value={editingLine.description} onChange={(event) => setEditingLine({ ...editingLine, description: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <input required type="number" min="1" step="1" aria-label="Edit item quantity" value={editingLine.quantity} onChange={(event) => setEditingLine({ ...editingLine, quantity: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <input required type="number" min="0" step="0.01" aria-label="Edit item unit price" value={editingLine.unitPrice} onChange={(event) => setEditingLine({ ...editingLine, unitPrice: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <button className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingLineId('')} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold">Cancel</button>
                </form>
              ) : <div key={item.lineItemId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                <div><p className="font-semibold">{item.description}</p><p className="text-xs text-gray-500">{item.quantity} × ${Number(item.unitPrice).toFixed(2)}</p></div>
                <div className="flex items-center gap-3"><b>${Number(item.lineTotal).toFixed(2)}</b>{canEditItems && <><button type="button" onClick={() => { setEditingLineId(item.lineItemId); setEditingLine({ description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice) }); }} className="text-xs font-semibold text-blue-700">Edit</button><button type="button" onClick={() => removeLineItem(item.lineItemId)} aria-label={`Remove ${item.description}`} className="text-rose-700"><Trash2 className="h-4 w-4" /></button></>}</div>
              </div>)}
              <div className="space-y-1 border-t pt-3 text-right text-sm"><p>Subtotal: ${Number(selectedBill.subtotal).toFixed(2)}</p><p>Tax ({Number(selectedBill.taxRatePercent).toFixed(2)}%): ${Number(selectedBill.taxAmount).toFixed(2)}</p><p className="font-bold">Total: ${Number(selectedBill.amountTotal).toFixed(2)} · Balance: ${Number(selectedBill.balanceDue ?? selectedBill.amountTotal).toFixed(2)}</p></div>
            </div>
            {canEditItems && <form onSubmit={addLineItem} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[1fr_90px_130px_auto]">
              <input required maxLength={255} aria-label="New item description" placeholder="Add description" value={lineForm.description} onChange={(event) => setLineForm({ ...lineForm, description: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input required type="number" min="1" step="1" aria-label="New item quantity" value={lineForm.quantity} onChange={(event) => setLineForm({ ...lineForm, quantity: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="0.01" aria-label="New item unit price" placeholder="Unit price" value={lineForm.unitPrice} onChange={(event) => setLineForm({ ...lineForm, unitPrice: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white">Add item</button>
            </form>}
            <div><h3 className="mb-2 font-bold">Payment history</h3>{selectedBill.payments?.length ? selectedBill.payments.map((payment) => <p key={payment.paymentId} className="rounded-lg bg-gray-50 p-2 text-sm">{displayDate(payment.paidAt)} · {payment.paymentMethod} · ${Number(payment.amount).toFixed(2)} · {payment.recordedBy}</p>) : <p className="text-sm text-gray-500">No payments recorded.</p>}</div>
            {canRecordPayment && <form onSubmit={recordPayment} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-semibold">Amount<input required type="number" min="0.01" max={Number(selectedBill.balanceDue ?? selectedBill.amountTotal)} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal" /></label>
              <label className="text-xs font-semibold">Method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal"><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label>
              <button className="self-end rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Record payment</button>
            </form>}
          </section>
        </div>
      )}
    </div>
  );
}
