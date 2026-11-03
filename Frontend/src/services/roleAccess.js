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

export function normalizeRole(role) {
  const normalized = String(role || '').replace(/^ROLE_/i, '').toUpperCase();
  return normalized === 'SUPER_ADMIN' ? 'ADMIN' : normalized;
}

export function canAccessPath(role, path) {
  const allowedPaths = rolePaths[normalizeRole(role)] || ['/'];
  return allowedPaths.includes(path);
}
