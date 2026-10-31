import React, { useState } from 'react';
import { Users, User, Clock, Shield, Search, Plus } from 'lucide-react';

export default function StaffPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const staffList = [
    {
      staffId: 'STF-000001',
      name: 'Sister Clara Barton',
      role: 'Head Nurse',
      subtype: 'Nurse',
      shift: 'Morning (07:00 - 15:00)',
      department: 'Emergency Theater Unit',
      email: 'clara.barton@meditek.com',
      phone: '+1-555-0301'
    },
    {
      staffId: 'STF-000002',
      name: 'Nurse Amy Adams',
      role: 'Staff Nurse',
      subtype: 'Nurse',
      shift: 'Night (23:00 - 07:00)',
      department: 'Intensive Care Unit (ICU)',
      email: 'amy.adams@meditek.com',
      phone: '+1-555-0302'
    },
    {
      staffId: 'STF-000003',
      name: 'David Livingstone',
      role: 'Senior Paramedic',
      subtype: 'MedicalStaff',
      shift: 'Rotational 24h',
      department: 'Emergency Theater Unit',
      email: 'david.l@meditek.com',
      phone: '+1-555-0303'
    },
    {
      staffId: 'STF-000004',
      name: 'Nurse Jennifer Lawrence',
      role: 'Surgical Nurse',
      subtype: 'Nurse',
      shift: 'Afternoon (15:00 - 23:00)',
      department: 'Operating Theaters (OR)',
      email: 'jennifer.l@meditek.com',
      phone: '+1-555-0304'
    },
    {
      staffId: 'STF-000005',
      name: 'Simon Riley',
      role: 'Biomedical Technician',
      subtype: 'MedicalStaff',
      shift: 'Morning (08:00 - 16:00)',
      department: 'Diagnostic Radiology',
      email: 'simon.riley@meditek.com',
      phone: '+1-555-0305'
    }
  ];

  const filtered = staffList.filter((s) => {
    const matchSearch = (s.name + s.department + s.role).toLowerCase().includes(search.toLowerCase());
    const matchFilter = roleFilter === 'ALL' || s.subtype === roleFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nursing & Clinical Support Staff</h2>
          <p className="text-sm text-gray-500">Personnel allocations, shift schedules, and department deployment</p>
        </div>
        <div className="flex gap-2">
          {['ALL', 'Nurse', 'MedicalStaff'].map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                roleFilter === tab ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'MedicalStaff' ? 'Clinical Staff' : tab === 'Nurse' ? 'Nurses' : 'All Staff'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Staff Member</th>
                <th className="pb-3">Business ID</th>
                <th className="pb-3">Clinical Role</th>
                <th className="pb-3">Assigned Department</th>
                <th className="pb-3">Active Shift</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filtered.map((s) => (
                <tr key={s.staffId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-lime-100 text-lime-800 font-bold flex items-center justify-center text-xs">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-xs font-bold text-gray-700">{s.staffId}</td>
                  <td className="py-3.5 font-medium text-gray-800">{s.role}</td>
                  <td className="py-3.5 text-xs font-semibold text-lime-800">{s.department}</td>
                  <td className="py-3.5 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {s.shift}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      On-Duty
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

