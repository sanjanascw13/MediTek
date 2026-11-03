import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Plus, Search, Droplets, Phone, Copy } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

export default function PatientsPage() {
  const role = api.getCurrentRole();
  const user = api.getCurrentUser();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: ''
  });

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rawPatients = await api.getPatients();
      const patientList = Array.isArray(rawPatients) ? rawPatients : [];
      if (role === 'DOCTOR') {
        const rawAppointments = await api.getAppointments();
        const appointments = Array.isArray(rawAppointments) ? rawAppointments : [];
        const assignedPatientIds = new Set(appointments
          .filter((appointment) => appointment?.doctorPersonId === user?.personId)
          .map((appointment) => appointment?.patientPersonId));
        setPatients(patientList.filter((patient) => assignedPatientIds.has(patient?.personId)));
      } else {
        setPatients(patientList);
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load patients.'));
    } finally {
      setLoading(false);
    }
  }, [role, user?.personId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let created;
      if (api.isMockMode() && api.getCurrentRole() === 'STAFF') {
        const registration = await api.registerDemoPatient(formData);
        created = registration.patient;
        setCredentials(registration.credentials);
      } else {
        const registration = await api.createPatient(formData);
        created = registration.patient || registration;
        if (registration.credentials) setCredentials(registration.credentials);
      }
      setPatients((current) => [created, ...current]);
      setShowModal(false);
      setSuccess(api.isMockMode() || created.credentials
        ? `Demo patient ${created.patientId} registered. Initial login credentials are shown once below.`
        : `Patient ${created.patientId} registered successfully.`);
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: 'MALE',
        bloodGroup: 'O+',
        address: '',
        emergencyContact: ''
      });
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to register patient.'));
    } finally {
      setSaving(false);
    }
  };

  const filtered = (Array.isArray(patients) ? patients : []).filter((p) =>
    Boolean(p) && [p.name, p.patientId, p.bloodGroup, p.address, p.phoneNumber]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Patient Registry & Electronic Health Records</h2>
          <p className="text-sm text-gray-500">{role === 'DOCTOR'
            ? 'Patients linked to your assigned appointments'
            : 'Demographics, emergency contacts, blood group matching, and clinical histories'}</p>
        </div>
        {(api.getCurrentRole() === 'STAFF' || (api.getCurrentRole() === 'ADMIN' && !api.isMockMode())) && <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-sm hover:bg-[#91d624] shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Register Patient</span>
        </button>}
      </div>

      {error && <ErrorState message={error} onRetry={loadPatients} />}
      {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}
      {credentials && (
        <div className="space-y-3 rounded-3xl border border-lime-300 bg-white p-5 shadow-sm">
          <div className="font-bold text-gray-900">Initial demo login credentials — copy now</div>
          <p className="select-all rounded-xl bg-gray-50 p-3 font-mono text-sm text-gray-800">Username: {credentials.username}<br />Temporary password: {credentials.password}</p>
          <button type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
              setSuccess('Initial patient credentials copied. Share them securely.');
            } catch (copyError) {
              setError(`Clipboard unavailable. Select and copy the visible credentials manually. ${api.getErrorMessage(copyError)}`);
            }
          }} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><Copy className="h-4 w-4" />Copy credentials</button>
        </div>
      )}

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
              {!loading && filtered.map((p) => (
                <tr key={p.patientId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-lime-100 text-lime-800 font-bold flex items-center justify-center text-xs">
                        {(p.name || 'P')[0]}
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
                      {p.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="7" className="py-4"><LoadingState label="Loading patients..." /></td></tr>}
              {!loading && !error && filtered.length === 0 && <tr><td colSpan="7" className="py-4"><EmptyState>{patients.length ? 'No patients match your search.' : 'No patients have been registered.'}</EmptyState></td></tr>}
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
                    max={new Date().toISOString().slice(0, 10)}
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
                    type="tel"
                    required
                    pattern="^0[0-9]{9}$"
                    maxLength={10}
                    title="Enter a 10-digit phone number starting with 0 (e.g. 0712345678)"
                    placeholder="0712345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">10 digits starting with 0</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    required
                    pattern="^0[0-9]{9}$"
                    maxLength={10}
                    title="Enter a 10-digit emergency contact starting with 0 (e.g. 0771234567)"
                    placeholder="0771234567"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">10 digits starting with 0</span>
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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] shadow-md disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
