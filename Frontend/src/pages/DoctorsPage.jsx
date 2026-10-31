import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Stethoscope, Phone, Mail, Award, CheckCircle, Search, Building2 } from 'lucide-react';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getDoctors().then(setDoctors);
  }, []);

  const filtered = doctors.filter((d) =>
    (d.name + d.specialization + d.departmentName).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Specialist Medical Officers & Doctors</h2>
          <p className="text-sm text-gray-500">Board-certified clinical consultants, department affiliations, and licensing credentials</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doctors, specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((doc) => (
          <div
            key={doc.doctorId}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {doc.name.split(' ')[1]?.[0] || 'D'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{doc.name}</h4>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-800">
                    <Stethoscope className="w-3 h-3 text-lime-700" />
                    {doc.specialization}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Doctor ID:</span>
                  <span className="font-mono font-bold text-gray-900">{doc.doctorId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">License:</span>
                  <span className="font-medium text-gray-800">{doc.licenseNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Department:</span>
                  <span className="font-semibold text-lime-800">{doc.departmentName}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{doc.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{doc.phoneNumber}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Active On-Call
              </span>
              <button className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs transition-all shadow-sm">
                View Roster
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

