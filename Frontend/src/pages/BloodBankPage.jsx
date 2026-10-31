import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Droplets, Plus, AlertCircle, CheckCircle, Calendar, MapPin } from 'lucide-react';

export default function BloodBankPage() {
  const [bloodUnits, setBloodUnits] = useState([]);

  useEffect(() => {
    api.getBloodUnits().then(setBloodUnits);
  }, []);

  const bloodSummary = [
    { type: 'O+', units: 28, volumeMl: 12600, status: 'SUFFICIENT' },
    { type: 'O-', units: 4, volumeMl: 1800, status: 'CRITICAL LOW' },
    { type: 'A+', units: 22, volumeMl: 9900, status: 'SUFFICIENT' },
    { type: 'A-', units: 6, volumeMl: 2700, status: 'MODERATE' },
    { type: 'B+', units: 18, volumeMl: 8100, status: 'SUFFICIENT' },
    { type: 'B-', units: 5, volumeMl: 2250, status: 'MODERATE' },
    { type: 'AB+', units: 12, volumeMl: 5400, status: 'SUFFICIENT' },
    { type: 'AB-', units: 2, volumeMl: 900, status: 'CRITICAL LOW' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Blood Bank & Hemotherapy Management</h2>
          <p className="text-sm text-gray-500">ABO/Rh inventory reserves, volume tracking in milliliters, and cold chain expiration</p>
        </div>
        <button className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Intake Blood Unit</span>
        </button>
      </div>

      {/* Blood Types Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {bloodSummary.map((b) => (
          <div
            key={b.type}
            className={`p-4 rounded-3xl border flex flex-col items-center justify-between text-center transition-all ${
              b.status === 'CRITICAL LOW'
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-lg mb-2">
              {b.type}
            </div>
            <span className="text-xl font-extrabold text-gray-900">{b.units}</span>
            <span className="text-[10px] text-gray-400">units ({b.volumeMl}ml)</span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 ${
                b.status === 'CRITICAL LOW' ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {b.status}
            </span>
          </div>
        ))}
      </div>

      {/* Unit Batches Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tracked Cryopreserved Blood Bags</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Unit ID</th>
                <th className="pb-3">Blood Bank Depot</th>
                <th className="pb-3">Blood Type</th>
                <th className="pb-3">Volume (ml)</th>
                <th className="pb-3">Collection Date</th>
                <th className="pb-3">Expiration Date</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {bloodUnits.map((u) => (
                <tr key={u.unitId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2 font-mono font-bold text-xs text-lime-800">{u.unitId}</td>
                  <td className="py-3.5 text-xs font-semibold text-gray-800">{u.bloodBank}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 font-black text-sm text-rose-600">
                      <Droplets className="w-3.5 h-3.5" />
                      {u.bloodType}
                    </span>
                  </td>
                  <td className="py-3.5 text-xs font-semibold text-gray-700">{u.quantityMl} ml</td>
                  <td className="py-3.5 text-xs text-gray-500">{u.collectionDate}</td>
                  <td className="py-3.5 text-xs font-medium text-gray-700">{u.expirationDate}</td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Valid
                    </span>
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

