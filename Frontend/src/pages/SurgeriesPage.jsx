import React from 'react';
import OperationsTable from '../components/dashboard/OperationsTable';
import { Scissors, Calendar, Clock, MapPin, UserCheck, Plus } from 'lucide-react';

export default function SurgeriesPage() {
  const theaters = [
    { theaterNumber: 'OT-101 (General)', department: 'Operating Theaters (OR)', status: 'ACTIVE IN SURGERY', currentPatient: 'John Deo', procedure: 'Laparoscopic Appendectomy' },
    { theaterNumber: 'OT-102 (Orthopedic)', department: 'Operating Theaters (OR)', status: 'AVAILABLE', currentPatient: null, procedure: null },
    { theaterNumber: 'OT-103 (Cardiac Suite)', department: 'Operating Theaters (OR)', status: 'SCHEDULED', currentPatient: 'Elena Rostova', procedure: 'Coronary Angioplasty (14:00)' },
    { theaterNumber: 'OT-104 (Trauma/Emergency)', department: 'Emergency Theater Unit', status: 'ON STANDBY', currentPatient: null, procedure: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Operating Theaters & Surgical Schedules</h2>
          <p className="text-sm text-gray-500">Surgical theater assignments, lead surgeon allocations, and procedural timelines</p>
        </div>
        <button className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Schedule Procedure</span>
        </button>
      </div>

      {/* Theater Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {theaters.map((th) => (
          <div key={th.theaterNumber} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-gray-400">Suite</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  th.status === 'ACTIVE IN SURGERY' ? 'bg-amber-100 text-amber-800' :
                  th.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {th.status}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{th.theaterNumber}</h4>
              <p className="text-xs text-gray-400 mb-3">{th.department}</p>
            </div>

            <div className="pt-3 border-t border-gray-100 text-xs">
              {th.currentPatient ? (
                <div>
                  <p className="font-semibold text-gray-800">{th.currentPatient}</p>
                  <p className="text-gray-500 text-[11px] truncate">{th.procedure}</p>
                </div>
              ) : (
                <span className="text-emerald-600 font-medium">Ready for next case</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Historical & Upcoming Operations Table */}
      <OperationsTable />
    </div>
  );
}

