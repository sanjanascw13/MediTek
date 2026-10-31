import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, Plus, Clock, User, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    doctorName: 'Dr. Robert Chen',
    date: '2026-06-25',
    time: '10:00 AM',
    type: 'General Consultation',
    status: 'SCHEDULED'
  });

  useEffect(() => {
    api.getAppointments().then(setAppointments);
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    const newApt = {
      id: `APT-00${appointments.length + 1}`,
      ...formData,
      color: '#84cc16'
    };
    setAppointments([newApt, ...appointments]);
    setShowModal(false);
  };

  const filtered = appointments.filter((a) => {
    const matchSearch = (a.patientName + a.doctorName + a.type).toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || a.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Appointments Management</h2>
          <p className="text-sm text-gray-500">Schedule, monitor, and coordinate patient consultations across departments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient, doctor, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-gray-200 text-xs font-semibold">
          {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((apt) => (
          <div
            key={apt.id}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-lime-50 text-lime-800 border border-lime-200">
                  {apt.id}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    apt.status === 'SCHEDULED'
                      ? 'bg-blue-50 text-blue-700'
                      : apt.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {apt.status}
                </span>
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">{apt.type}</h4>
              <div className="space-y-1 text-xs text-gray-600 mt-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Patient: <strong className="text-gray-800">{apt.patientName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-lime-600" />
                  <span>Consultant: <strong className="text-gray-800">{apt.doctorName}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{apt.date}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{apt.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Book Clinical Consultation</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Deo"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Doctor</label>
                  <select
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    <option>Dr. Robert Chen (Cardiology)</option>
                    <option>Dr. Sarah Connor (Neurology)</option>
                    <option>Dr. Bruce Wayne (Orthopedics)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Consultation Type</label>
                  <input
                    type="text"
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
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
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

