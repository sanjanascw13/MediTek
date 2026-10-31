import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Pill, Plus, Search, DollarSign, Package, CheckCircle } from 'lucide-react';

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getMedicines().then(setMedicines);
  }, []);

  const filtered = medicines.filter((m) =>
    (m.name + m.category).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pharmacy Dispensary & Medicine Formulary</h2>
          <p className="text-sm text-gray-500">Inventory tracking, pharmaceutical pricing, and prescription dispensing</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine name, class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((med) => (
          <div
            key={med.medicineId}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-gray-400">{med.medicineId}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-800">
                  {med.category}
                </span>
              </div>

              <div className="flex items-start space-x-3 mb-4">
                <div className="p-3 rounded-2xl bg-lime-50 text-lime-700">
                  <Pill className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">{med.name}</h4>
                  <p className="text-xs text-gray-400">Unit Price: <strong className="text-gray-900">${med.price.toFixed(2)}</strong></p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500">Stock Available:</span>
                <span className="text-lime-800 font-bold">{med.stock} units</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> In Stock
              </span>
              <button className="px-3.5 py-1.5 rounded-xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] transition-all">
                Dispense
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

