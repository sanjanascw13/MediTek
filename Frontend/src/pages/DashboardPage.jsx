import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  UserPlus,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Copy,
  Check,
  Stethoscope,
  Pill,
  Bed,
  Receipt,
  Microscope,
  UserCircle,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  Users,
  Building2,
  X,
  Mail,
  Phone,
  Calendar,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions,
  saveRolePermissions,
  resetRolePermissions,
} from '../services/roleAccess';
import { ErrorState, LoadingState, EmptyState } from '../components/ApiState';

const MANAGED_ROLES = [
  { id: 'DOCTOR', name: 'Doctor', icon: Stethoscope, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'PHARMACIST', name: 'Pharmacist', icon: Pill, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'LAB_WORKER', name: 'Lab Worker', icon: Microscope, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'RECEPTIONIST', name: 'Receptionist', icon: Bed, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'PATIENT', name: 'Patient', icon: UserCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

export default function DashboardPage() {
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState(() => getRolePermissions());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectUser, setInspectUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // New User Form State
  const [addForm, setAddForm] = useState({
    targetRole: 'DOCTOR',
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'MALE',
    departmentId: '',
    specialization: 'General Medicine',
    licenseNumber: '',
    staffRole: 'Pharmacist',
    emergencyContact: '',
  });

  // Created credentials modal state
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docList, staffList, patientList, deptList] = await Promise.all([
        api.getManagedDoctors(),
        api.getManagedStaff(),
        api.getPatients(),
        api.getDepartments(),
      ]);
      setDoctors(docList || []);
      setStaff(staffList || []);
      setPatients(patientList || []);
      const depts = Array.isArray(deptList) ? deptList : [];
      setDepartments(depts);
      if (depts.length > 0 && !addForm.departmentId) {
        setAddForm((c) => ({ ...c, departmentId: depts[0].departmentId }));
      }
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to load hospital accounts.'));
    } finally {
      setLoading(false);
    }
  }, [addForm.departmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync permissions from storage or external update
  useEffect(() => {
    const handleUpdate = () => {
      setPermissions(getRolePermissions());
    };
    window.addEventListener('meditek_permissions_updated', handleUpdate);
    return () => window.removeEventListener('meditek_permissions_updated', handleUpdate);
  }, []);

  // Normalize all hospital accounts into unified directory
  const unifiedAccounts = useMemo(() => {
    const list = [];

    // Doctors
    (doctors || []).forEach((d) => {
      list.push({
        id: d.doctorId || d.id,
        personId: d.personId,
        type: 'DOCTOR',
        roleLabel: 'Doctor',
        name: d.name,
        email: d.email,
        phone: d.phoneNumber,
        department: d.departmentName || 'General Medicine',
        specialization: d.specialization || 'Clinical Doctor',
        license: d.licenseNumber,
        isActive: d.isActive !== false,
        raw: d,
      });
    });

    // Staff (Pharmacist, Lab Worker, Receptionist)
    (staff || []).forEach((s) => {
      const designation = String(s.role || '').toLowerCase();
      let type = 'STAFF';
      let roleLabel = s.role || 'Hospital Staff';
      if (designation === 'pharmacist' || s.name?.toLowerCase().includes('pharmacist')) {
        type = 'PHARMACIST';
        roleLabel = 'Pharmacist';
      } else if (designation.includes('lab') || s.name?.toLowerCase().includes('lab')) {
        type = 'LAB_WORKER';
        roleLabel = 'Lab Worker';
      } else if (designation === 'receptionist' || s.name?.toLowerCase().includes('reception')) {
        type = 'RECEPTIONIST';
        roleLabel = 'Receptionist';
      }

      list.push({
        id: s.staffId || s.id,
        personId: s.personId,
        type,
        roleLabel,
        name: s.name,
        email: s.email,
        phone: s.phoneNumber,
        department: s.departmentName || 'General Operations',
        designation: s.role,
        isActive: s.isActive !== false,
        raw: s,
      });
    });

    // Patients
    (patients || []).forEach((p) => {
      list.push({
        id: p.patientId || p.id,
        personId: p.personId,
        type: 'PATIENT',
        roleLabel: 'Patient',
        name: p.name,
        email: p.email,
        phone: p.phoneNumber,
        department: 'Outpatient Care',
        isActive: p.isActive !== false,
        raw: p,
      });
    });

    return list;
  }, [doctors, staff, patients]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return unifiedAccounts.filter((acc) => {
      if (activeRoleFilter !== 'ALL' && acc.type !== activeRoleFilter) {
        return false;
      }
      if (statusFilter === 'ACTIVE' && !acc.isActive) return false;
      if (statusFilter === 'INACTIVE' && acc.isActive) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        acc.name?.toLowerCase().includes(q) ||
        acc.id?.toLowerCase().includes(q) ||
        acc.email?.toLowerCase().includes(q) ||
        acc.phone?.toLowerCase().includes(q) ||
        acc.roleLabel?.toLowerCase().includes(q) ||
        acc.department?.toLowerCase().includes(q)
      );
    });
  }, [unifiedAccounts, activeRoleFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = unifiedAccounts.length;
    const docCount = unifiedAccounts.filter((a) => a.type === 'DOCTOR' && a.isActive).length;
    const pharmaCount = unifiedAccounts.filter((a) => a.type === 'PHARMACIST' && a.isActive).length;
    const labCount = unifiedAccounts.filter((a) => a.type === 'LAB_WORKER' && a.isActive).length;
    const recepCount = unifiedAccounts.filter((a) => a.type === 'RECEPTIONIST' && a.isActive).length;
    const patientCount = unifiedAccounts.filter((a) => a.type === 'PATIENT' && a.isActive).length;
    return { total, docCount, pharmaCount, labCount, recepCount, patientCount };
  }, [unifiedAccounts]);

  // Permission Matrix Toggle Handler
  const handleTogglePermission = (roleId, moduleId) => {
    const updated = {
      ...permissions,
      [roleId]: {
        ...(permissions[roleId] || {}),
        [moduleId]: !permissions[roleId]?.[moduleId],
      },
    };
    setPermissions(updated);
    saveRolePermissions(updated);
    const statusText = updated[roleId][moduleId] ? 'granted' : 'revoked';
    setSuccess(`Access updated: ${moduleId.toUpperCase()} access ${statusText} for role ${roleId}.`);
  };

  // Reset to default permissions
  const handleResetPermissions = () => {
    resetRolePermissions();
    setPermissions(getRolePermissions());
    setSuccess('Role access matrix reset to system factory defaults.');
  };

  // Apply Strict Role Isolation Preset
  const handleApplyStrictPreset = () => {
    const strictPreset = {
      DOCTOR: { patients: true, clinical: true, pharmacy: true, wards: false, billing: false, labs: true },
      PHARMACIST: { patients: false, clinical: false, pharmacy: true, wards: false, billing: false, labs: false },
      LAB_WORKER: { patients: false, clinical: false, pharmacy: false, wards: false, billing: false, labs: true },
      RECEPTIONIST: { patients: true, clinical: false, pharmacy: false, wards: true, billing: true, labs: false },
      PATIENT: { patients: false, clinical: false, pharmacy: false, wards: false, billing: false, labs: true },
    };
    setPermissions(strictPreset);
    saveRolePermissions(strictPreset);
    setSuccess('Applied Strict Role Isolation Preset: Each role is strictly locked to its designated domain.');
  };

  // Toggle user active status
  const handleToggleUserStatus = async (user) => {
    setActionInProgress(true);
    setError('');
    setSuccess('');
    try {
      const newStatus = !user.isActive;
      if (user.type === 'DOCTOR') {
        await api.setDoctorActive(user.id, newStatus);
      } else if (user.type === 'PATIENT') {
        // Patient activation toggle
        if (!newStatus) {
          await api.deletePatient(user.id);
        }
      } else {
        await api.setStaffActive(user.id, newStatus);
      }
      setSuccess(`Account status updated for ${user.name} (${user.id}).`);
      await loadData();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to update account status.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete user account
  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    setActionInProgress(true);
    setError('');
    setSuccess('');
    try {
      if (deleteConfirmUser.type === 'DOCTOR') {
        await api.deleteDoctor(deleteConfirmUser.id);
      } else if (deleteConfirmUser.type === 'PATIENT') {
        await api.deletePatient(deleteConfirmUser.id);
      } else {
        await api.deleteStaff(deleteConfirmUser.id);
      }
      setSuccess(`Account ${deleteConfirmUser.id} (${deleteConfirmUser.name}) successfully removed.`);
      setDeleteConfirmUser(null);
      await loadData();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to delete account.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Create new user form submit
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!addForm.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!addForm.email.trim()) {
      setError('Email address is required.');
      return;
    }

    setActionInProgress(true);
    setError('');
    setSuccess('');
    try {
      if (addForm.targetRole === 'DOCTOR') {
        const created = await api.createDoctor({
          name: addForm.fullName.trim(),
          email: addForm.email.trim(),
          phoneNumber: addForm.phoneNumber.trim() || '0771234567',
          dateOfBirth: addForm.dateOfBirth || '1985-06-15',
          gender: addForm.gender,
          specialization: addForm.specialization,
          licenseNumber: addForm.licenseNumber.trim() || `SLMC-${Math.floor(10000 + Math.random() * 90000)}`,
          departmentId: addForm.departmentId || null,
        });
        setCreatedCredentials({
          name: created.name,
          role: 'Doctor',
          id: created.doctorId,
          username: created.username,
          temporaryPassword: created.temporaryPassword,
        });
      } else if (addForm.targetRole === 'PATIENT') {
        const result = await api.registerPatient({
          name: addForm.fullName.trim(),
          email: addForm.email.trim(),
          phoneNumber: addForm.phoneNumber.trim() || '0771234567',
          dateOfBirth: addForm.dateOfBirth || '1995-01-01',
          gender: addForm.gender,
          address: 'Colombo, Sri Lanka',
          emergencyContact: addForm.emergencyContact.trim() || '0779876543',
        });
        setCreatedCredentials({
          name: result.patient?.name || addForm.fullName,
          role: 'Patient',
          id: result.patient?.patientId,
          username: result.credentials?.username || 'Auto-generated',
          temporaryPassword: result.credentials?.password || 'Sent via email',
        });
      } else {
        // Staff: Pharmacist, Lab Worker, Receptionist
        let staffRoleTitle = 'Staff Member';
        if (addForm.targetRole === 'PHARMACIST') staffRoleTitle = 'Pharmacist';
        if (addForm.targetRole === 'LAB_WORKER') staffRoleTitle = 'Laboratory Technician';
        if (addForm.targetRole === 'RECEPTIONIST') staffRoleTitle = 'Receptionist';

        const created = await api.createStaff({
          name: addForm.fullName.trim(),
          email: addForm.email.trim(),
          phoneNumber: addForm.phoneNumber.trim() || '0771234567',
          dateOfBirth: addForm.dateOfBirth || '1990-03-20',
          gender: addForm.gender,
          role: staffRoleTitle,
          departmentId: addForm.departmentId || null,
        });
        setCreatedCredentials({
          name: created.name,
          role: staffRoleTitle,
          id: created.staffId,
          username: created.username,
          temporaryPassword: created.temporaryPassword,
        });
      }

      setShowAddModal(false);
      setAddForm({
        targetRole: 'DOCTOR',
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: 'MALE',
        departmentId: departments[0]?.departmentId || '',
        specialization: 'General Medicine',
        licenseNumber: '',
        staffRole: 'Pharmacist',
        emergencyContact: '',
      });
      await loadData();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to create user account.'));
    } finally {
      setActionInProgress(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `MediTek Hospital Access Credentials\nUser: ${createdCredentials.name} (${createdCredentials.role})\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.temporaryPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner & Hospital Telemetry */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white p-7 rounded-3xl shadow-xl border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-lime-400 text-gray-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin Command Hub
              </span>
              <span className="text-gray-400 text-xs">Role-Based Access Control & User Administration</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Hospital Access & Authority Center
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Provision users across all 6 hospital roles, configure real-time module access policies (tick on/off), and manage account lifecycles securely.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              title="Refresh directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setError('');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#a3e635] hover:bg-lime-400 text-gray-950 font-black text-xs sm:text-sm transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Person</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Accounts</p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-sky-500/10 p-3.5 rounded-2xl border border-sky-500/20">
            <p className="text-[10px] uppercase font-bold text-sky-400">Doctors</p>
            <p className="text-2xl font-black text-sky-300 mt-0.5">{stats.docCount}</p>
          </div>
          <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
            <p className="text-[10px] uppercase font-bold text-amber-400">Pharmacists</p>
            <p className="text-2xl font-black text-amber-300 mt-0.5">{stats.pharmaCount}</p>
          </div>
          <div className="bg-purple-500/10 p-3.5 rounded-2xl border border-purple-500/20">
            <p className="text-[10px] uppercase font-bold text-purple-400">Lab Workers</p>
            <p className="text-2xl font-black text-purple-300 mt-0.5">{stats.labCount}</p>
          </div>
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
            <p className="text-[10px] uppercase font-bold text-emerald-400">Receptionists</p>
            <p className="text-2xl font-black text-emerald-300 mt-0.5">{stats.recepCount}</p>
          </div>
          <div className="bg-rose-500/10 p-3.5 rounded-2xl border border-rose-500/20">
            <p className="text-[10px] uppercase font-bold text-rose-400">Patients</p>
            <p className="text-2xl font-black text-rose-300 mt-0.5">{stats.patientCount}</p>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadData} />}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs sm:text-sm font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Interactive Permission Matrix: Tick On / Off */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-lime-600" />
              Role Access & Module Permission Matrix
            </h2>
            <p className="text-xs text-gray-500">
              Tick on/off to grant or revoke system module access for any role. Users are restricted in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyStrictPreset}
              className="px-3.5 py-2 rounded-xl bg-lime-50 hover:bg-lime-100 text-lime-900 text-xs font-bold border border-lime-200 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-700" />
              <span>Strict Mode Preset</span>
            </button>
            <button
              onClick={handleResetPermissions}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4 w-48">System Role</th>
                {SYSTEM_MODULES.map((mod) => (
                  <th key={mod.id} className="py-3 px-4 text-center">
                    <div>{mod.name}</div>
                    <div className="text-[10px] font-mono lowercase font-normal text-gray-400">
                      {mod.paths[0]}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Policy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {MANAGED_ROLES.map((role) => {
                const Icon = role.icon;
                const rolePerms = permissions[role.id] || DEFAULT_ROLE_PERMISSIONS[role.id] || {};
                const activeCount = Object.values(rolePerms).filter(Boolean).length;
                return (
                  <tr key={role.id} className="hover:bg-lime-50/20 transition-colors">
                    {/* Role Header */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${role.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{role.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{role.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Module Checkbox Toggles */}
                    {SYSTEM_MODULES.map((mod) => {
                      const isGranted = Boolean(rolePerms[mod.id]);
                      return (
                        <td key={mod.id} className="py-3 px-4 text-center">
                          <label className="inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => handleTogglePermission(role.id, mod.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a3e635] peer-checked:after:bg-[#142008] transition-colors relative"></div>
                          </label>
                        </td>
                      );
                    })}

                    {/* Status Pill */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                        {activeCount} of {SYSTEM_MODULES.length} modules granted
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Hospital User Accounts Directory */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-lime-600" />
              Hospital User Directory
            </h2>
            <p className="text-xs text-gray-500">
              Manage accounts, inspect detailed clinical profiles, toggle login states, and delete accounts.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {['ALL', 'DOCTOR', 'PHARMACIST', 'LAB_WORKER', 'RECEPTIONIST', 'PATIENT'].map((r) => {
            const count = r === 'ALL'
              ? unifiedAccounts.length
              : unifiedAccounts.filter((a) => a.type === r).length;
            const active = activeRoleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setActiveRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-gray-950 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r === 'ALL' ? 'All Accounts' : r.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingState label="Loading user accounts..." />
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <UserCircle className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">No matching accounts found</p>
            <p className="text-xs text-gray-400">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role & Domain</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Permitted Access</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredAccounts.map((acc) => {
                  const rolePerms = permissions[acc.type] || DEFAULT_ROLE_PERMISSIONS[acc.type] || {};
                  return (
                    <tr key={acc.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm">{acc.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{acc.id}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lime-100 text-lime-950 border border-lime-200">
                          {acc.roleLabel}
                        </span>
                        {acc.specialization && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{acc.specialization}</div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>{acc.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{acc.phone}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-gray-700">
                        <span className="font-semibold">{acc.department}</span>
                      </td>

                      {/* Permitted Modules Pills */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1 max-w-xs mx-auto">
                          {SYSTEM_MODULES.map((m) => {
                            const isAllowed = Boolean(rolePerms[m.id]);
                            if (!isAllowed) return null;
                            return (
                              <span
                                key={m.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700"
                              >
                                {m.name}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {acc.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Inspect Details */}
                          <button
                            type="button"
                            onClick={() => setInspectUser(acc)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(acc)}
                            disabled={actionInProgress}
                            className={`p-1.5 rounded-lg transition-colors ${
                              acc.isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={acc.isActive ? 'Suspend Login' : 'Activate Login'}
                          >
                            {acc.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(acc)}
                            disabled={actionInProgress}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-lime-600" />
                  Add Hospital User
                </h3>
                <p className="text-xs text-gray-500">Provision credentials and clinical scope for a new member.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Target Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MANAGED_ROLES.map((r) => {
                  const active = addForm.targetRole === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setAddForm((c) => ({ ...c, targetRole: r.id }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        active
                          ? 'bg-lime-400 text-gray-950 font-bold border-lime-500 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-bold">{r.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* General Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jennifer Lawrence"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((c) => ({ ...c, fullName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. doctor@meditek.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm((c) => ({ ...c, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="0771234567"
                  value={addForm.phoneNumber}
                  onChange={(e) => setAddForm((c) => ({ ...c, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={addForm.dateOfBirth}
                  onChange={(e) => setAddForm((c) => ({ ...c, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  value={addForm.gender}
                  onChange={(e) => setAddForm((c) => ({ ...c, gender: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Department (for staff/doctors) */}
              {addForm.targetRole !== 'PATIENT' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department</label>
                  <select
                    value={addForm.departmentId}
                    onChange={(e) => setAddForm((c) => ({ ...c, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Doctor Specifics */}
              {addForm.targetRole === 'DOCTOR' && (
                <>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiologist"
                      value={addForm.specialization}
                      onChange={(e) => setAddForm((c) => ({ ...c, specialization: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      placeholder="SLMC-49201"
                      value={addForm.licenseNumber}
                      onChange={(e) => setAddForm((c) => ({ ...c, licenseNumber: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </>
              )}

              {/* Patient Specifics */}
              {addForm.targetRole === 'PATIENT' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="0779876543"
                    value={addForm.emergencyContact}
                    onChange={(e) => setAddForm((c) => ({ ...c, emergencyContact: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              )}
            </div>

            {/* Informational notice */}
            <div className="p-3 bg-lime-50 rounded-2xl border border-lime-200 text-xs text-lime-950 flex items-start gap-2">
              <Key className="w-4 h-4 text-lime-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated Credentials Provisioning</p>
                <p className="text-[11px] text-lime-800">
                  A username and secure temporary password will be generated automatically and displayed for one-click copying.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionInProgress}
                className="px-5 py-2 rounded-xl bg-[#a3e635] hover:bg-lime-400 text-gray-950 text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {actionInProgress ? 'Provisioning…' : 'Create & Provision Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Created Credentials Display */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-lime-100 text-lime-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">User Account Provisioned</h3>
              <p className="text-xs text-gray-500 mt-1">
                Account created for <strong>{createdCredentials.name}</strong> ({createdCredentials.role}).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">User ID:</span>
                <span className="font-mono font-bold text-gray-900">{createdCredentials.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Username:</span>
                <span className="font-mono font-bold text-lime-900 bg-lime-100 px-2 py-0.5 rounded">
                  {createdCredentials.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Password:</span>
                <span className="font-mono font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded">
                  {createdCredentials.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-all shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Inspect User Details Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-lime-600" />
                  Account Profile Inspector
                </h3>
                <p className="text-xs text-gray-500">Record ID: {inspectUser.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Full Name</span>
                  <p className="font-bold text-gray-900 text-sm">{inspectUser.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Assigned Role</span>
                  <p className="font-bold text-lime-900">{inspectUser.roleLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                  <p className="font-semibold text-gray-800">{inspectUser.email}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Phone</span>
                  <p className="font-semibold text-gray-800">{inspectUser.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Department</span>
                  <p className="font-semibold text-gray-800">{inspectUser.department}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Account Status</span>
                  <p className="font-bold text-gray-900">{inspectUser.isActive ? 'Active' : 'Suspended'}</p>
                </div>
              </div>
            </div>

            {/* Permitted Modules */}
            <div>
              <p className="text-xs font-bold text-gray-800 mb-2">Permitted Modules for this User</p>
              <div className="flex flex-wrap gap-1.5">
                {SYSTEM_MODULES.map((m) => {
                  const rolePerms = permissions[inspectUser.type] || DEFAULT_ROLE_PERMISSIONS[inspectUser.type] || {};
                  const isAllowed = Boolean(rolePerms[m.id]);
                  return (
                    <span
                      key={m.id}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isAllowed
                          ? 'bg-lime-100 text-lime-950 border-lime-300'
                          : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      }`}
                    >
                      {m.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-gray-900">Confirm Account Deletion</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete the account for <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.id})?
              </p>
              <p className="text-[11px] text-gray-400 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                This account will be deactivated and removed from active system access.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionInProgress}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
              >
                {actionInProgress ? 'Deleting…' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
