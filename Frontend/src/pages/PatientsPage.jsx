import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Plus, Search, Droplets, MapPin, Phone, ShieldCheck, HeartPulse } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: ''
  });

  useEffect(() => {
    api.getPatients().then(setPatients);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const created = await api.createPatient(formData);
    setPatients([created, ...patients]);
    setShowModal(false);
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      bloodGroup: 'O+',
      address: '',
      emergencyContact: ''
    });
  };

  const filtered = patients.filter((p) =>
    (p.name + p.patientId + p.bloodGroup + p.address).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Patient Registry & Electronic Health Records</h2>
          <p className="text-sm text-gray-500">Demographics, emergency contacts, blood group matching, and clinical histories</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Register Patient</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="mb-4 max-w-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, patient ID, blood type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Patient Name</th>
                <th className="pb-3">Patient ID</th>
                <th className="pb-3">Blood Group</th>
                <th className="pb-3">Gender / DOB</th>
                <th className="pb-3">Phone & Emergency Contact</th>
                <th className="pb-3">Residential Address</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filtered.map((p) => (
                <tr key={p.patientId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-lime-100 text-lime-800 font-bold flex items-center justify-center text-xs">
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-xs font-bold text-lime-800">{p.patientId}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Droplets className="w-3 h-3 text-rose-500" />
                      {p.bloodGroup}
                    </span>
                  </td>
                  <td className="py-3.5 text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">{p.gender}</span>
                    <span className="text-gray-400 block">{p.dateOfBirth}</span>
                  </td>
                  <td className="py-3.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{p.phoneNumber}</span>
                    </div>
                    <span className="text-gray-400 text-[11px] block">ICE: {p.emergencyContact}</span>
                  </td>
                  <td className="py-3.5 text-xs text-gray-600 max-w-xs truncate" title={p.address}>
                    {p.address}
                  </td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Patient Admission & Registration</h3>
            <p className="text-xs text-gray-500 mb-4">Complete patient demographic and emergency profile</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+1-555-0100"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+1-555-0999"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Residential Address</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street address, City, Country"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] shadow-md"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

