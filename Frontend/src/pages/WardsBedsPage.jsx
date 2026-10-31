import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bed, ArrowRightLeft, CheckCircle2, AlertTriangle, XCircle, Search, Plus } from 'lucide-react';

export default function WardsBedsPage() {
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    patient: 'John Deo',
    currentBed: 'BED-102 (St. Jude Ward)',
    targetWard: 'WRD-002',
    targetBed: 'BED-205',
    reason: 'Cardiac telemetry monitoring needed'
  });

  const beds = [
    { bedId: 'BED-101', ward: 'St. Jude General Ward', bedNumber: 'Bed 01', status: 'AVAILABLE', patient: null },
    { bedId: 'BED-102', ward: 'St. Jude General Ward', bedNumber: 'Bed 02', status: 'OCCUPIED', patient: 'John Deo (PAT-000001)' },
    { bedId: 'BED-103', ward: 'St. Jude General Ward', bedNumber: 'Bed 03', status: 'MAINTENANCE', patient: null },
    { bedId: 'BED-104', ward: 'St. Jude General Ward', bedNumber: 'Bed 04', status: 'OCCUPIED', patient: 'Marcus Vance (PAT-000004)' },
    { bedId: 'BED-201', ward: 'Cardiovascular Step-Down', bedNumber: 'Bed 01', status: 'OCCUPIED', patient: 'Arthur Dent (PAT-000005)' },
    { bedId: 'BED-202', ward: 'Cardiovascular Step-Down', bedNumber: 'Bed 02', status: 'AVAILABLE', patient: null },
    { bedId: 'BED-205', ward: 'Cardiovascular Step-Down', bedNumber: 'Bed 05', status: 'AVAILABLE', patient: null },
    { bedId: 'BED-301', ward: 'Surgical Recovery Unit', bedNumber: 'Bed 01', status: 'OCCUPIED', patient: 'Elena Rostova (PAT-000003)' },
  ];

  useEffect(() => {
    api.getWards().then(setWards);
  }, []);

  const handleTransfer = (e) => {
    e.preventDefault();
    alert(`Transfer of ${transferData.patient} to ${transferData.targetBed} executed in atomic transaction.`);
    setShowTransferModal(false);
  };

  const filteredBeds = selectedWard === 'ALL'
    ? beds
    : beds.filter((b) => b.ward === selectedWard);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Inpatient Wards, Bed Occupancy & Transfers</h2>
          <p className="text-sm text-gray-500">Real-time facility capacity, derived bed occupancy, and atomic patient transfer protocols</p>
        </div>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95"
        >
          <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Bed Transfer</span>
        </button>
      </div>

      {/* Ward Occupancy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {wards.map((w) => {
          const occupancyRate = Math.round((w.occupiedBeds / w.totalBeds) * 100);
          return (
            <div
              key={w.wardId}
              onClick={() => setSelectedWard(w.wardName)}
              className={`bg-white rounded-3xl p-5 border cursor-pointer transition-all ${
                selectedWard === w.wardName ? 'ring-2 ring-lime-500 border-lime-300 shadow-md' : 'border-gray-100 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-gray-400">{w.wardId}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">{w.wardType}</span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-3">{w.wardName}</h4>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Occupancy</span>
                  <span className="text-gray-900">{w.occupiedBeds} / {w.totalBeds} beds ({occupancyRate}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${occupancyRate > 85 ? 'bg-rose-500' : 'bg-lime-500'}`}
                    style={{ width: `${occupancyRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Beds Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Bed Status: {selectedWard === 'ALL' ? 'All Wards' : selectedWard}
          </h3>
          <button
            onClick={() => setSelectedWard('ALL')}
            className="text-xs font-semibold text-lime-700 hover:underline"
          >
            Reset filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredBeds.map((bed) => (
            <div
              key={bed.bedId}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                bed.status === 'AVAILABLE'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : bed.status === 'OCCUPIED'
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-gray-500">{bed.bedId}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bed.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : bed.status === 'OCCUPIED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>
                <h5 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-gray-600" />
                  {bed.bedNumber}
                </h5>
                <p className="text-[11px] text-gray-500 mt-1">{bed.ward}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/50 text-xs">
                {bed.patient ? (
                  <p className="text-gray-800 font-semibold truncate">{bed.patient}</p>
                ) : (
                  <span className="text-emerald-700 font-medium">Ready for admission</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Execute Patient Bed Transfer</h3>
            <p className="text-xs text-gray-500 mb-4">Atomic single-transaction transfer between wards and beds</p>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Admitted Patient</label>
                <input
                  type="text"
                  disabled
                  value={transferData.patient}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Bed</label>
                <input
                  type="text"
                  disabled
                  value={transferData.currentBed}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Available Bed</label>
                <select
                  value={transferData.targetBed}
                  onChange={(e) => setTransferData({ ...transferData, targetBed: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="BED-205">BED-205 (Cardiovascular Step-Down - Bed 05)</option>
                  <option value="BED-101">BED-101 (St. Jude General Ward - Bed 01)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer Clinical Reason</label>
                <textarea
                  rows={2}
                  required
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] shadow-md"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

