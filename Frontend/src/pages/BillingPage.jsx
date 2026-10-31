import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Receipt, DollarSign, CheckCircle2, Clock, Plus, Search, FileText } from 'lucide-react';

export default function BillingPage() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    api.getBills().then(setBills);
  }, []);

  const totalRevenue = bills.filter(b => b.status === 'PAID').reduce((sum, b) => sum + b.amountTotal, 0);
  const pendingRevenue = bills.filter(b => b.status === 'PENDING').reduce((sum, b) => sum + b.amountTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Patient Billing & Hospital Accounting</h2>
          <p className="text-sm text-gray-500">Inpatient admissions billing, itemized pharmaceuticals, and payment reconciliation</p>
        </div>
        <button className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Generate Invoice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400">Total Settled Receipts</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">${totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400">Outstanding Receivables</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">${pendingRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400">Active Invoices</p>
            <h3 className="text-2xl font-black text-lime-800 mt-1">{bills.length} Records</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-lime-50 text-lime-700">
            <Receipt className="w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Invoice #</th>
                <th className="pb-3">Patient Account</th>
                <th className="pb-3">Total Amount</th>
                <th className="pb-3">Issued Date</th>
                <th className="pb-3">Settlement Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {bills.map((b) => (
                <tr key={b.billId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2 font-mono font-bold text-xs text-lime-800">{b.billId}</td>
                  <td className="py-3.5 font-bold text-gray-900">{b.patientName}</td>
                  <td className="py-3.5 font-black text-gray-900">${b.amountTotal.toFixed(2)}</td>
                  <td className="py-3.5 text-xs text-gray-500">{b.issuedAt}</td>
                  <td className="py-3.5 text-xs text-gray-500">{b.paidAt || '—'}</td>
                  <td className="py-3.5">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        b.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <button className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500">
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

