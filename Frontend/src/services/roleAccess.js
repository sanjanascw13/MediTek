export const SYSTEM_MODULES = [
  { id: 'patients', name: 'Patients', icon: 'UserCircle', paths: ['/patients'], desc: 'Patient profiles & records' },
  { id: 'clinical', name: 'Clinical Care', icon: 'Stethoscope', paths: ['/appointments', '/doctors'], desc: 'Doctor appointments & visits' },
  { id: 'pharmacy', name: 'Pharmacy', icon: 'Pill', paths: ['/pharmacy'], desc: 'Formulary & medication dispensing' },
  { id: 'wards', name: 'Wards & Beds', icon: 'Bed', paths: ['/wards'], desc: 'Bed availability & admissions' },
  { id: 'billing', name: 'Billing', icon: 'Receipt', paths: ['/billing'], desc: 'Invoices & payment collection' },
  { id: 'labs', name: 'Laboratory', icon: 'Microscope', paths: ['/labs'], desc: 'Lab orders & diagnostic reports' },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  DOCTOR: { patients: true, clinical: true, pharmacy: true, wards: false, billing: false, labs: true },
  PHARMACIST: { patients: false, clinical: false, pharmacy: true, wards: false, billing: false, labs: false },
  LAB_WORKER: { patients: false, clinical: false, pharmacy: false, wards: false, billing: false, labs: true },
  RECEPTIONIST: { patients: true, clinical: true, pharmacy: false, wards: true, billing: true, labs: false },
  PATIENT: { patients: false, clinical: false, pharmacy: false, wards: false, billing: false, labs: true },
};

const PERMISSIONS_STORAGE_KEY = 'meditek_role_permissions';

export function getRolePermissions() {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROLE_PERMISSIONS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ROLE_PERMISSIONS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_ROLE_PERMISSIONS };
  }
}

export function saveRolePermissions(permissions) {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    window.dispatchEvent(new Event('meditek_permissions_updated'));
  } catch (err) {
    console.error('Failed to save permissions to localStorage', err);
  }
}

export function resetRolePermissions() {
  try {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    window.dispatchEvent(new Event('meditek_permissions_updated'));
  } catch (err) {
    console.error('Failed to reset permissions', err);
  }
}

export function normalizeRole(role, user = null) {
  const normalized = String(role || '').replace(/^ROLE_/i, '').toUpperCase();
  const designation = String(user?.designation || user?.role || '').toLowerCase();
  const username = String(user?.username || '').toLowerCase();

  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') {
    return 'SUPER_ADMIN';
  }

  if (normalized === 'STAFF') {
    if (designation === 'pharmacist' || username === 'meditek_pharma') {
      return 'PHARMACIST';
    }
    if (designation === 'receptionist' || username === 'meditek_reception') {
      return 'RECEPTIONIST';
    }
    if (designation.includes('lab') || username.startsWith('meditek_lab') || username.includes('lab')) {
      return 'LAB_WORKER';
    }
    return 'STAFF';
  }

  return normalized;
}

export function getAllowedPaths(role, user = null) {
  const roleKey = normalizeRole(role, user);

  // Super Admin only accesses the Admin Command Dashboard & Change Password.
  // Super Admin cannot see wards, billing, pharmacy, appointments, etc.
  if (roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN') {
    return ['/', '/change-password'];
  }

  // Patient Portal core paths
  if (roleKey === 'PATIENT') {
    const patientBase = [
      '/',
      '/change-password',
      '/patient/appointments',
      '/patient/prescriptions',
      '/patient/bills',
      '/patient/records',
    ];
    const permissions = getRolePermissions().PATIENT || {};
    if (permissions.labs) patientBase.push('/labs');
    if (permissions.billing) patientBase.push('/billing');
    return patientBase;
  }

  // Clinical, staff, and frontline roles
  const basePaths = ['/', '/change-password'];
  const permissions = getRolePermissions()[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey] || {};

  SYSTEM_MODULES.forEach((mod) => {
    if (permissions[mod.id]) {
      basePaths.push(...mod.paths);
    }
  });

  return Array.from(new Set(basePaths));
}

export function canAccessPath(role, path, user = null) {
  const allowed = getAllowedPaths(role, user);
  return allowed.includes(path);
}
