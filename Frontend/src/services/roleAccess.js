export const rolePaths = {
  ADMIN: [
    '/',
    '/appointments',
    '/doctors',
    '/staff',
    '/patients',
    '/departments',
    '/wards',
    '/pharmacy',
    '/labs',
    '/surgeries',
    '/blood-bank',
    '/billing',
    '/medical-records',
    '/messages',
    '/settings',
    '/user-management',
  ],
  SUPER_ADMIN: [
    '/',
    '/appointments',
    '/doctors',
    '/staff',
    '/patients',
    '/departments',
    '/wards',
    '/pharmacy',
    '/labs',
    '/surgeries',
    '/blood-bank',
    '/billing',
    '/medical-records',
    '/messages',
    '/settings',
    '/user-management',
  ],
  DOCTOR: [
    '/',
    '/change-password',
    '/appointments',
    '/doctors',
    '/patients',
    '/pharmacy',
    '/labs',
    '/surgeries',
    '/medical-records',
    '/messages',
  ],
  PHARMACIST: [
    '/',
    '/change-password',
    '/pharmacy',
  ],
  STAFF: [
    '/',
    '/change-password',
    '/appointments',
    '/staff',
    '/patients',
    '/wards',
    '/medical-records',
    '/billing',
    '/pharmacy',
    '/labs',
    '/blood-bank',
    '/messages',
  ],
  PATIENT: [
    '/',
    '/change-password',
    '/appointments',
    '/patient/appointments',
    '/patient/prescriptions',
    '/patient/bills',
    '/patient/records',
    '/billing',
    '/labs',
  ],
};

export function normalizeRole(role, user = null) {
  const normalized = String(role || '').replace(/^ROLE_/i, '').toUpperCase();
  const designation = String(user?.designation || '').toLowerCase();
  const username = String(user?.username || '').toLowerCase();

  if (normalized === 'STAFF') {
    if (designation === 'pharmacist' || username === 'meditek_pharma') {
      return 'PHARMACIST';
    }
  }

  return normalized === 'SUPER_ADMIN' ? 'ADMIN' : normalized;
}

export function canAccessPath(role, path, user = null) {
  const roleKey = normalizeRole(role, user);
  const allowedPaths = rolePaths[roleKey] || ['/'];
  return allowedPaths.includes(path);
}
