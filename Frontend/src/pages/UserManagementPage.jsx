import React, { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Pencil, ShieldAlert, UserPlus, UserRoundCog, UserRoundPen } from 'lucide-react';
import { api } from '../services/api';
import { ErrorState, LoadingState } from '../components/ApiState';

const emptyForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  departmentId: '',
  specialization: '',
  licenseNumber: '',
  designation: '',
  username: '',
  password: '',
};

const mapManagedAccounts = (doctors, staff) => [
  ...doctors.map((doctor) => ({
    accountId: doctor.doctorId,
    role: 'DOCTOR',
    fullName: doctor.name,
    email: doctor.email,
    phoneNumber: doctor.phoneNumber,
    department: doctor.departmentName,
    specialization: doctor.specialization,
    isActive: doctor.isActive !== false,
  })),
  ...staff.map((member) => ({
    accountId: member.staffId,
    role: 'STAFF',
    fullName: member.name,
    email: member.email,
    phoneNumber: member.phoneNumber,
    department: member.departmentName,
    designation: member.role,
    isActive: member.isActive !== false,
  })),
];

function AccountForm({
  role,
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  departments,
  departmentsLoading,
  departmentsError,
  retryDepartments,
  designationTypes,
  designationLoading,
  designationError,
  retryDesignations,
  editing = false,
  liveMode = false,
}) {
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [specializationLoading, setSpecializationLoading] = useState(false);
  const [specializationError, setSpecializationError] = useState('');
  const [specializationRetry, setSpecializationRetry] = useState(0);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    if (role !== 'DOCTOR' || !form.departmentId || liveMode) {
      setSpecializations([]);
      setSpecializationError('');
      setSpecializationLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSpecializations([]);
    setSpecializationError('');
    setSpecializationLoading(true);
    api.getDoctorSpecializations(form.departmentId)
      .then((items) => {
        if (!cancelled) setSpecializations(items);
      })
      .catch((requestError) => {
        if (!cancelled) setSpecializationError(api.getErrorMessage(requestError, 'Unable to load specializations.'));
      })
      .finally(() => {
        if (!cancelled) setSpecializationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, form.departmentId, specializationRetry, liveMode]);

  const generateUsername = () => {
    try {
      if (!form.fullName.trim()) {
        throw new Error('Enter the full name before generating a username.');
      }
      setForm((current) => ({
        ...current,
        username: api.generateDemoUsername(current.fullName),
      }));
      setGenerationError('');
    } catch (error) {
      setGenerationError(api.getErrorMessage(error));
    }
  };

  const generatePassword = async () => {
    setGenerating(true);
    setGenerationError('');
    try {
      setForm((current) => ({ ...current, password: '' }));
      const password = await api.generateDemoTemporaryPassword();
      setForm((current) => ({ ...current, password }));
    } catch (error) {
      setGenerationError(api.getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700">
          Full name
          <input required maxLength={120} value={form.fullName} onChange={update('fullName')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Email
          <input required type="email" maxLength={liveMode ? 128 : 180} value={form.email} onChange={update('email')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Phone number
          <input required type="tel" maxLength={40} pattern={liveMode ? '0[0-9]{9}' : undefined} title={liveMode ? 'Enter a 10-digit phone number beginning with 0.' : undefined} value={form.phoneNumber} onChange={update('phoneNumber')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
        </label>
        {liveMode && (
          <>
            <label className="text-sm font-semibold text-gray-700">
              Date of birth
              <input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={update('dateOfBirth')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Gender
              <select required value={form.gender} onChange={update('gender')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal">
                <option value="">Select a gender</option>
                {['MALE', 'FEMALE', 'OTHER'].map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="text-sm font-semibold text-gray-700">
          Department
          <select
            disabled={departmentsLoading}
            value={form.departmentId}
            onChange={(event) => setForm((current) => ({
              ...current,
              departmentId: event.target.value,
              specialization: '',
            }))}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal disabled:bg-gray-100"
          >
            <option value="">{departmentsLoading ? 'Loading departments...' : departmentsError ? 'Department list unavailable (optional)' : departments.length ? 'Select a department (optional)' : 'No departments configured (optional)'}</option>
            {departments.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName}</option>)}
          </select>
          {departmentsError && <span className="mt-1 block text-xs text-rose-700">Unable to load departments. <button type="button" onClick={retryDepartments} className="font-semibold underline">Retry</button></span>}
          {!departmentsLoading && !departmentsError && departments.length === 0 && <span className="mt-1 block text-xs text-amber-800">No departments configured yet. Department assignment is optional.</span>}
        </label>
        {role === 'DOCTOR' ? (
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
            Specialization
            {liveMode ? (
              <input required minLength={2} maxLength={64} value={form.specialization} onChange={update('specialization')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
            ) : (
              <>
                <select
                  required
                  disabled={!form.departmentId || specializationLoading || Boolean(specializationError) || specializations.length === 0}
                  value={form.specialization}
                  onChange={update('specialization')}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal disabled:bg-gray-100"
                >
                  <option value="">{!form.departmentId ? 'Select a department first' : specializationLoading ? 'Loading specializations...' : specializationError ? 'Specialization list unavailable' : specializations.length ? 'Select a specialization' : 'No specializations for this department'}</option>
                  {specializations.map((specialization) => <option key={specialization} value={specialization}>{specialization}</option>)}
                </select>
                {specializationError && <span className="mt-1 block text-xs text-rose-700">Unable to load specializations. <button type="button" onClick={() => setSpecializationRetry((current) => current + 1)} className="font-semibold underline">Retry</button></span>}
                {!specializationLoading && !specializationError && form.departmentId && specializations.length === 0 && <span className="mt-1 block text-xs text-amber-800">No doctors in this department provide a specialization option.</span>}
              </>
            )}
          </label>
        ) : (
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
            Staff designation / type
            <select
              required
              disabled={designationLoading || Boolean(designationError) || designationTypes.length === 0}
              value={form.designation}
              onChange={update('designation')}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal disabled:bg-gray-100"
            >
              <option value="">{designationLoading ? 'Loading staff types...' : designationError ? 'Staff type list unavailable' : designationTypes.length ? 'Select a staff type' : 'No staff types available'}</option>
              {designationTypes.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
            </select>
            {designationError && <span className="mt-1 block text-xs text-rose-700">Unable to load staff types. <button type="button" onClick={retryDesignations} className="font-semibold underline">Retry</button></span>}
            {!designationLoading && !designationError && designationTypes.length === 0 && <span className="mt-1 block text-xs text-amber-800">No staff designation types are configured.</span>}
          </label>
        )}
        {liveMode && role === 'DOCTOR' && (
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
            License number
            <input required minLength={5} maxLength={64} value={form.licenseNumber} onChange={update('licenseNumber')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
          </label>
        )}
        {!editing && !liveMode && (
          <>
            <label className="text-sm font-semibold text-gray-700">
              Username
              <input required minLength={3} maxLength={60} autoComplete="off" value={form.username} onChange={update('username')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={generateUsername} className="w-full rounded-xl border border-lime-300 bg-lime-50 px-3 py-2.5 text-sm font-bold text-lime-900">
                Generate unique username
              </button>
            </div>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Initial temporary password
              <input required minLength={16} autoComplete="new-password" value={form.password} onChange={update('password')} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm font-normal" />
            </label>
            <button type="button" disabled={generating} onClick={generatePassword} className="rounded-xl border border-lime-300 bg-lime-50 px-3 py-2.5 text-sm font-bold text-lime-900 disabled:opacity-50">
              {generating ? 'Generating secure password...' : 'Generate secure temporary password'}
            </button>
          </>
        )}
      </div>
      {generationError && <p role="alert" className="text-sm text-rose-700">{generationError}</p>}
      <div className="flex justify-end gap-3">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>}
        <button type="submit" disabled={saving || generating} className="rounded-xl bg-[#a3e635] px-5 py-2.5 text-sm font-bold text-[#142008] disabled:opacity-50">
          {saving ? 'Saving...' : editing ? 'Save changes' : `Create ${role === 'DOCTOR' ? 'Doctor' : 'Staff'}${liveMode ? ' account' : ' demo account'}`}
        </button>
      </div>
    </form>
  );
}

export default function UserManagementPage() {
  const liveMode = !api.isMockMode();
  const isAdmin = api.getCurrentRole() === 'ADMIN';
  const [role, setRole] = useState('DOCTOR');
  const [form, setForm] = useState(emptyForm);
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');
  const [designationTypes, setDesignationTypes] = useState([]);
  const [designationLoading, setDesignationLoading] = useState(true);
  const [designationError, setDesignationError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    setDepartmentsError('');
    try {
      setDepartments(await api.getDepartments());
    } catch (requestError) {
      setDepartments([]);
      setDepartmentsError(api.getErrorMessage(requestError, 'Unable to load departments.'));
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const loadDesignationTypes = useCallback(async () => {
    setDesignationLoading(true);
    setDesignationError('');
    try {
      setDesignationTypes(await api.getStaffDesignationTypes());
    } catch (requestError) {
      setDesignationTypes([]);
      setDesignationError(api.getErrorMessage(requestError, 'Unable to load staff types.'));
    } finally {
      setDesignationLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (liveMode) {
        const [doctors, staff] = await Promise.all([
          api.getManagedDoctors(),
          api.getManagedStaff(),
        ]);
        setAccounts(mapManagedAccounts(doctors, staff));
      } else {
        setAccounts(await api.listDemoAccounts());
      }
      return true;
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, `Unable to load ${liveMode ? 'accounts' : 'demo accounts'}.`));
      return false;
    } finally {
      setLoading(false);
    }
  }, [liveMode]);

  useEffect(() => {
    if (liveMode && !isAdmin) {
      setLoading(false);
      setDepartmentsLoading(false);
      setDesignationLoading(false);
      return;
    }
    loadAccounts();
    loadDepartments();
    loadDesignationTypes();
  }, [isAdmin, liveMode, loadAccounts, loadDepartments, loadDesignationTypes]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setCredentials(null);
    try {
      let account;
      let missingCredentials = false;
      if (liveMode) {
        const payload = {
          name: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phoneNumber: form.phoneNumber.trim(),
          email: form.email.trim(),
          departmentId: form.departmentId ? form.departmentId : null,
          ...(role === 'DOCTOR'
            ? {
              specialization: form.specialization.trim(),
              licenseNumber: form.licenseNumber.trim(),
            }
            : { role: form.designation.trim() }),
        };
        account = role === 'DOCTOR'
          ? await api.createDoctor(payload)
          : await api.createStaff(payload);
        if (account.username && account.temporaryPassword) {
          setCredentials({ username: account.username, password: account.temporaryPassword });
          const notice = account.emailNotificationMessage ? ` ${account.emailNotificationMessage}` : '';
          setSuccess(`${role === 'DOCTOR' ? 'Doctor' : 'Staff'} account created.${notice} Copy the temporary credentials now; the new user must change the password at first sign-in.`);
        } else {
          missingCredentials = true;
        }
        await loadAccounts();
        if (missingCredentials) {
          setError('The account was created, but the backend did not return temporary credentials. Contact an administrator before the new user signs in.');
        }
      } else {
        account = await api.createDemoAccount({ ...form, role });
        setAccounts((current) => [...current, account]);
        setCredentials({ username: account.username, password: form.password });
        setSuccess(`${role === 'DOCTOR' ? 'Doctor' : 'Staff'} demo account created. Copy the initial credentials now; the password will not be shown again.`);
      }
      setForm(emptyForm);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, `Unable to create ${liveMode ? 'account' : 'demo account'}.`));
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (account) => {
    setEditing(account.accountId);
    setEditForm({
      fullName: account.fullName,
      email: account.email,
      phoneNumber: account.phoneNumber,
      departmentId: account.departmentId || '',
      specialization: account.specialization || '',
      designation: account.designation || '',
    });
    setError('');
    setSuccess('');
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const account = await api.updateDemoAccount(editing, editForm);
      setAccounts((current) => current.map((item) => item.accountId === account.accountId ? account : item));
      setEditing(null);
      setSuccess('Demo account details updated.');
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to update demo account.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (account) => {
    if (!window.confirm(`Deactivate ${account.fullName}'s account? They will no longer be able to sign in.`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (liveMode) {
        if (account.role === 'DOCTOR') await api.setDoctorActive(account.accountId, false);
        else await api.setStaffActive(account.accountId, false);
        setAccounts((current) => current.map((item) => item.accountId === account.accountId ? { ...item, isActive: false } : item));
        setSuccess(`${account.fullName}'s account was deactivated.`);
        await loadAccounts();
      } else {
        const updated = api.deactivateDemoAccount(account.accountId);
        setAccounts((current) => current.map((item) => item.accountId === updated.accountId ? updated : item));
        setSuccess(`${account.fullName}'s demo account was deactivated.`);
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, `Unable to deactivate ${liveMode ? 'account' : 'demo account'}.`));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (account) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (liveMode) {
        if (account.role === 'DOCTOR') await api.setDoctorActive(account.accountId, true);
        else await api.setStaffActive(account.accountId, true);
        setAccounts((current) => current.map((item) => item.accountId === account.accountId ? { ...item, isActive: true } : item));
        setSuccess(`${account.fullName}'s account was reactivated.`);
        await loadAccounts();
      } else {
        const updated = api.activateDemoAccount(account.accountId);
        setAccounts((current) => current.map((item) => item.accountId === updated.accountId ? updated : item));
        setSuccess(`${account.fullName}'s demo account was reactivated.`);
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, `Unable to reactivate ${liveMode ? 'account' : 'demo account'}.`));
    } finally {
      setSaving(false);
    }
  };

  const handleResendDoctorActivation = async (account) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.resendDoctorActivation(account.accountId);
      if (res?.message) {
        setSuccess(res.message);
      } else {
        setSuccess(`Activation instructions resent to ${account.email}.`);
      }
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to resend activation email.'));
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
      setSuccess(`${liveMode ? 'Temporary' : 'Initial'} credentials copied. Share them securely with the ${liveMode ? 'new account holder' : 'demo user'}.`);
    } catch (copyError) {
      setError(`Unable to access the clipboard: ${api.getErrorMessage(copyError)} Select the visible credentials and copy them manually.`);
    }
  };

  if (liveMode) {
    if (!isAdmin) {
      return <section className="space-y-4"><h1 className="text-3xl font-black text-gray-900">User Management</h1><p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Only Super Admin can manage Doctor and Staff accounts.</p></section>;
    }
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Live backend accounts</p>
          <h1 className="mt-1 text-3xl font-black text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Provision Doctor and Staff accounts. The backend generates a username and one-time temporary password.</p>
        </div>
        {error && <ErrorState message={error} onRetry={loadAccounts} />}
        {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
        {credentials && (
          <div className="space-y-3 rounded-3xl border border-lime-300 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-gray-900"><KeyRound className="h-5 w-5 text-lime-800" />Temporary credentials — copy now</div>
            <p className="select-all rounded-xl bg-gray-50 p-3 font-mono text-sm text-gray-800">Username: {credentials.username}<br />Temporary password: {credentials.password}</p>
            <button type="button" onClick={copyCredentials} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><Copy className="h-4 w-4" />Copy credentials</button>
          </div>
        )}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2"><UserPlus className="h-5 w-5 text-lime-800" /><h2 className="text-xl font-bold text-gray-900">Create account</h2></div>
          <div className="mb-5 flex gap-2">
            {['DOCTOR', 'STAFF'].map((item) => (
              <button key={item} type="button" onClick={() => { setRole(item); setForm(emptyForm); setCredentials(null); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${role === item ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {item === 'DOCTOR' ? 'Doctor' : 'Staff'}
              </button>
            ))}
          </div>
          <AccountForm
            role={role}
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            saving={saving}
            departments={departments}
            departmentsLoading={departmentsLoading}
            departmentsError={departmentsError}
            retryDepartments={loadDepartments}
            designationTypes={designationTypes}
            designationLoading={designationLoading}
            designationError={designationError}
            retryDesignations={loadDesignationTypes}
            liveMode
          />
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-lime-800" /><h2 className="text-xl font-bold text-gray-900">Doctor and Staff directory</h2></div>
          <p className="mb-5 text-sm text-gray-500">Editing profile details is not supported by the current backend API. Activation controls are available.</p>
          {loading ? <LoadingState label="Loading accounts..." /> : accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No Doctor or Staff records were returned by the backend.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <article key={`${account.role}-${account.accountId}`} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">{account.fullName}</h3>
                        <span className="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-900">{account.role}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${account.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-200 text-gray-600'}`}>{account.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{account.accountId} · {account.email} · {account.phoneNumber}</p>
                      <p className="text-sm text-gray-500">{account.department || 'No department assigned'} · {account.specialization || account.designation || 'No designation'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {account.role === 'DOCTOR' && account.isActive && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleResendDoctorActivation(account)}
                          className="rounded-xl border border-lime-300 bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-900 hover:bg-lime-100 disabled:opacity-50"
                        >
                          Resend Setup Email
                        </button>
                      )}
                      {account.isActive
                        ? <button type="button" disabled={saving} onClick={() => handleDeactivate(account)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Deactivate</button>
                        : <button type="button" disabled={saving} onClick={() => handleActivate(account)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50">Activate</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Hospital Administration</p>
        <h1 className="mt-1 text-3xl font-black text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">Configure and manage Doctor, Staff, and clinical user accounts.</p>
      </div>
      {error && <ErrorState message={error} onRetry={loadAccounts} />}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
      {credentials && (
        <div className="space-y-3 rounded-3xl border border-lime-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-gray-900"><KeyRound className="h-5 w-5 text-lime-800" />Initial credentials — copy now</div>
          <p className="select-all rounded-xl bg-gray-50 p-3 font-mono text-sm text-gray-800">Username: {credentials.username}<br />Temporary password: {credentials.password}</p>
          <button type="button" onClick={copyCredentials} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><Copy className="h-4 w-4" />Copy credentials</button>
        </div>
      )}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2"><UserPlus className="h-5 w-5 text-lime-800" /><h2 className="text-xl font-bold text-gray-900">Create account</h2></div>
        <div className="mb-5 flex gap-2">
          {['DOCTOR', 'STAFF'].map((item) => (
            <button key={item} type="button" onClick={() => { setRole(item); setForm(emptyForm); setCredentials(null); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${role === item ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {item === 'DOCTOR' ? 'Doctor' : 'Staff'}
            </button>
          ))}
        </div>
        <AccountForm
          role={role}
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          saving={saving}
          departments={departments}
          departmentsLoading={departmentsLoading}
          departmentsError={departmentsError}
          retryDepartments={loadDepartments}
          designationTypes={designationTypes}
          designationLoading={designationLoading}
          designationError={designationError}
          retryDesignations={loadDesignationTypes}
        />
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-lime-800" /><h2 className="text-xl font-bold text-gray-900">Created demo accounts</h2></div>
        {loading ? <LoadingState label="Loading demo accounts..." /> : accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No Doctor or Staff demo accounts have been created in this browser.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <article key={account.accountId} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{account.fullName}</h3>
                      <span className="rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-900">{account.role}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${account.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-200 text-gray-600'}`}>{account.isActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
                      {account.mustChangePassword && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">PASSWORD CHANGE REQUIRED</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{account.username} · {account.email} · {account.phoneNumber}</p>
                    <p className="text-sm text-gray-500">{account.department} · {account.specialization || account.designation}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditing(account)} className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><Pencil className="h-3.5 w-3.5" />Edit</button>
                    {account.isActive && <button type="button" onClick={() => handleDeactivate(account)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Deactivate</button>}
                    {!account.isActive && <button type="button" onClick={() => handleActivate(account)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Activate</button>}
                  </div>
                </div>
                {editing === account.accountId && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900"><UserRoundPen className="h-4 w-4" />Edit account details</div>
                    <AccountForm
                      role={account.role}
                      form={editForm}
                      setForm={setEditForm}
                      onSubmit={handleEdit}
                      onCancel={() => setEditing(null)}
                      saving={saving}
                      departments={departments}
                      departmentsLoading={departmentsLoading}
                      departmentsError={departmentsError}
                      retryDepartments={loadDepartments}
                      designationTypes={designationTypes}
                      designationLoading={designationLoading}
                      designationError={designationError}
                      retryDesignations={loadDesignationTypes}
                      editing
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
