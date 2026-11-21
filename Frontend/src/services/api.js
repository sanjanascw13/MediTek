import axios from 'axios';
import { normalizeRole } from './roleAccess';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:8080/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const MOCK_TOKEN = 'mock-session';
const AUTH_MODE_KEY = 'meditek_auth_mode';
const DEMO_ACCOUNTS_KEY = 'meditek_demo_accounts';
const DEMO_PATIENTS_KEY = 'meditek_demo_patients';
const PASSWORD_ITERATIONS = 120000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('meditek_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('meditek_token');
      localStorage.removeItem('meditek_user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

const requestOrMock = (mockResult, request) => (
  USE_MOCKS ? Promise.resolve(mockResult()) : request().then((response) => (response && response.data !== undefined ? response.data : response))
);

const unavailable = (module) => Promise.reject(
  new Error(`${module} is not available from the current backend API.`)
);

const mapMedicineFromApi = (medicine) => ({
  ...medicine,
  name: medicine.medicineName,
  stock: medicine.quantity,
});

const mapLabTestFromApi = (test, report) => ({
  testId: test.testId,
  patientPersonId: test.patientId,
  patientName: test.patientName,
  orderedByPersonId: test.doctorId,
  orderedByName: test.doctorName,
  testType: test.testName,
  requestedAt: test.testDate,
  status: test.status,
  reportId: test.reportId,
  result: test.result,
  summary: report?.resultDetails || null,
});

const mapSurgeryFromApi = (surgery) => ({
  ...surgery,
  procedure: surgery.surgeryType,
  surgeryDate: surgery.scheduledAt,
  currentPatientPersonId: surgery.patientId,
});

const mapBloodUnitFromApi = (unit) => ({
  ...unit,
  bloodBank: unit.bloodBankName,
});

function getDemoAccounts() {
  const stored = localStorage.getItem(DEMO_ACCOUNTS_KEY);
  if (!stored) return [];
  try {
    const accounts = JSON.parse(stored);
    if (!Array.isArray(accounts)) throw new Error('Stored demo accounts are invalid.');
    return accounts;
  } catch (error) {
    throw new Error(`Unable to read saved demo accounts: ${error.message}`);
  }
}

function saveDemoAccounts(accounts) {
  localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function publicDemoAccount({ passwordHash, passwordSalt, ...account }) {
  return account;
}

function requireWebCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser cryptography is unavailable. Use localhost or a secure HTTPS origin.');
  }
}

function randomBytes(length) {
  requireWebCrypto();
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  requireWebCrypto();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: Uint8Array.from(salt.match(/.{2}/g), (byte) => parseInt(byte, 16)),
    iterations: PASSWORD_ITERATIONS,
    hash: 'SHA-256',
  }, key, 256);
  return toHex(new Uint8Array(bits));
}

async function matchesPassword(password, account) {
  const hash = await hashPassword(password, account.passwordSalt);
  return hash === account.passwordHash;
}

function sanitizeUsername(username) {
  return username.trim().toLowerCase();
}

function requireDemoAdmin() {
  requireDemoRole(['ADMIN']);
}

function requireDemoRole(roles) {
  if (!USE_MOCKS) throw new Error('This action is available only in development mock mode.');
  if (!roles.includes(api.getCurrentRole())) throw new Error(`This action requires one of these demo roles: ${roles.join(', ')}.`);
}

function normalizeDemoBill(bill, knownPatient = null) {
  const patient = knownPatient || mockStore.patients.find((item) => item.personId === bill.patientPersonId);
  const amountTotal = Number(bill.amountTotal || 0);
  const amountPaid = Number(
    bill.amountPaid ?? (bill.status === 'PAID' ? amountTotal : 0)
  );
  const items = bill.items || [{
    lineItemId: `${bill.billId}-ITEM-1`,
    description: 'Existing demo invoice',
    quantity: 1,
    unitPrice: amountTotal,
    lineTotal: amountTotal,
  }];
  return {
    ...bill,
    patientId: bill.patientId || patient?.patientId || '',
    items,
    subtotal: Number(bill.subtotal ?? amountTotal),
    taxRatePercent: Number(bill.taxRatePercent || 0),
    taxAmount: Number(bill.taxAmount || 0),
    amountTotal,
    amountPaid,
    balanceDue: Number(bill.balanceDue ?? Math.max(0, amountTotal - amountPaid)),
    payments: bill.payments || [],
  };
}

function demoBillLineItem(details, lineItemId = `BLI-DEMO-${Date.now()}`) {
  const quantity = Number(details.quantity);
  const unitPrice = Number(details.unitPrice);
  if (!details.description?.trim() || !Number.isInteger(quantity) || quantity <= 0
      || !Number.isFinite(unitPrice) || unitPrice < 0
      || Math.round(unitPrice * 100) !== unitPrice * 100) {
    throw new Error('Enter a description, positive whole-number quantity, and non-negative unit price.');
  }
  return {
    lineItemId,
    description: details.description.trim(),
    quantity,
    unitPrice,
    lineTotal: Number((quantity * unitPrice).toFixed(2)),
  };
}

function recalculateDemoBill(bill, items) {
  const normalized = normalizeDemoBill(bill);
  if (normalized.status !== 'PENDING' || normalized.amountPaid !== 0) {
    throw new Error('Invoice line items can be changed only before payments begin.');
  }
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const taxAmount = Number((subtotal * normalized.taxRatePercent / 100).toFixed(2));
  const amountTotal = Number((subtotal + taxAmount).toFixed(2));
  if (amountTotal <= 0) throw new Error('Invoice total must be greater than zero.');
  Object.assign(bill, {
    items,
    subtotal,
    taxAmount,
    amountTotal,
    balanceDue: amountTotal,
  });
  return normalizeDemoBill(bill);
}

async function passwordAlreadyUsed(password, accounts, exceptAccountId) {
  for (const account of accounts) {
    if (account.accountId === exceptAccountId) continue;
    if (await matchesPassword(password, account)) return true;
  }
  return false;
}

// Mock fallback store so the UI is immediately interactive and functional
const mockStore = {
  stats: {
    newPatients: 129,
    appointments: 650,
    earning: 201450,
    operations: 54,
  },
  patientDistributions: [
    { name: 'Dengue', value: 22, color: '#f97316' },
    { name: 'Malaria', value: 20, color: '#84cc16' },
    { name: 'Typhoid', value: 15, color: '#0ea5e9' },
    { name: 'Cold', value: 18, color: '#a855f7' },
  ],
  operations: [
    {
      id: 'OP-001',
      patientName: 'John Deo',
      patientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '12-08-2026',
      duration: '3 hours',
      followUpDate: '12-09-2026',
      surgeon: 'Dr. Robert Chen',
      theater: 'OT-101'
    },
    {
      id: 'OP-002',
      patientName: 'Jens Brincker',
      patientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '14-08-2026',
      duration: '2 hours',
      followUpDate: '14-09-2026',
      surgeon: 'Dr. Sarah Connor',
      theater: 'OT-102'
    },
    {
      id: 'OP-003',
      patientName: 'Elena Rostova',
      patientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '18-08-2026',
      duration: '4 hours',
      followUpDate: '18-09-2026',
      surgeon: 'Dr. Robert Chen',
      theater: 'OT-103'
    },
    {
      id: 'OP-004',
      patientName: 'Marcus Vance',
      patientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '20-08-2026',
      duration: '1.5 hours',
      followUpDate: '20-09-2026',
      surgeon: 'Dr. Amy Adams',
      theater: 'OT-101'
    }
  ],
  appointments: [
    {
      id: 'APT-001',
      patientPersonId: 'PER-000001',
      doctorPersonId: 'PER-000010',
      patientName: 'John Deo',
      doctorName: 'Dr. Robert Chen',
      date: '2026-11-02T09:00:00',
      time: '09:00 AM',
      type: 'Cardiology follow-up',
      status: 'SCHEDULED',
      color: '#84cc16'
    },
    {
      id: 'APT-002',
      patientPersonId: 'PER-000002',
      doctorPersonId: 'PER-000011',
      patientName: 'Jens Brincker',
      doctorName: 'Dr. Sarah Connor',
      date: '2026-11-02T11:00:00',
      time: '11:00 AM',
      type: 'Neurology consultation',
      status: 'SCHEDULED',
      color: '#a855f7'
    },
    {
      id: 'APT-003',
      patientPersonId: 'PER-000003',
      doctorPersonId: 'PER-000012',
      patientName: 'Elena Rostova',
      doctorName: 'Dr. Bruce Wayne',
      date: '2026-11-03T10:00:00',
      time: '10:00 AM',
      type: 'Cardio Follow-up',
      status: 'SCHEDULED',
      color: '#0ea5e9'
    }
  ],
  admissions: [
    {
      admissionId: 'ADM-DEMO-001',
      patientPersonId: 'PER-000001',
      patientName: 'John Deo',
      bedId: 'BED-102',
      bedNumber: 'Bed 02',
      wardId: 'WRD-001',
      wardName: 'St. Jude General Ward',
      admittingDoctorPersonId: 'PER-000010',
      admittingDoctorName: 'Dr. Robert Chen',
      admissionDate: '2026-10-25T14:00:00Z',
      status: 'ACTIVE',
      reason: 'Post-operative monitoring',
    },
  ],
  patients: [
    {
      personId: 'PER-000001',
      patientId: 'PAT-000001',
      name: 'John Deo',
      email: 'john.deo@example.com',
      phoneNumber: '+1-555-0192',
      dateOfBirth: '1988-04-12',
      gender: 'MALE',
      bloodGroup: 'O+',
      address: '742 Evergreen Terrace, Springfield',
      emergencyContact: '+1-555-0199',
      isActive: true
    },
    {
      personId: 'PER-000002',
      patientId: 'PAT-000002',
      name: 'Jens Brincker',
      email: 'jens.brincker@example.com',
      phoneNumber: '+1-555-0193',
      dateOfBirth: '1992-09-21',
      gender: 'FEMALE',
      bloodGroup: 'A+',
      address: '42 Wallaby Way, Sydney',
      emergencyContact: '+1-555-0198',
      isActive: true
    },
    {
      personId: 'PER-000003',
      patientId: 'PAT-000003',
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phoneNumber: '+1-555-0194',
      dateOfBirth: '1995-11-05',
      gender: 'FEMALE',
      bloodGroup: 'B+',
      address: '10 Downing Street, London',
      emergencyContact: '+1-555-0197',
      isActive: true
    }
  ],
  staff: [
    {
      staffId: 'STF-000001',
      personId: 'STF-000001',
      name: 'Sister Clara Barton',
      role: 'Head Nurse',
      subtype: 'Nurse',
      shift: 'Morning (07:00 - 15:00)',
      department: 'Emergency Theater Unit',
      email: 'clara.barton@meditek.com',
      phone: '+1-555-0301',
      isActive: true,
    },
    {
      staffId: 'STF-000002',
      personId: 'STF-000002',
      name: 'Nurse Amy Adams',
      role: 'Staff Nurse',
      subtype: 'Nurse',
      shift: 'Night (23:00 - 07:00)',
      department: 'Intensive Care Unit (ICU)',
      email: 'amy.adams@meditek.com',
      phone: '+1-555-0302',
      isActive: true,
    },
    {
      staffId: 'STF-000003',
      personId: 'STF-000003',
      name: 'David Livingstone',
      role: 'Senior Paramedic',
      subtype: 'MedicalStaff',
      shift: 'Rotational 24h',
      department: 'Emergency Theater Unit',
      email: 'david.l@meditek.com',
      phone: '+1-555-0303',
      isActive: true,
    },
    {
      staffId: 'STF-000004',
      personId: 'STF-000004',
      name: 'Nurse Jennifer Lawrence',
      role: 'Surgical Nurse',
      subtype: 'Nurse',
      shift: 'Afternoon (15:00 - 23:00)',
      department: 'Operating Theaters (OR)',
      email: 'jennifer.l@meditek.com',
      phone: '+1-555-0304',
      isActive: true,
    },
    {
      staffId: 'STF-000005',
      personId: 'STF-000005',
      name: 'Simon Riley',
      role: 'Biomedical Technician',
      subtype: 'MedicalStaff',
      shift: 'Morning (08:00 - 16:00)',
      department: 'Diagnostic Radiology',
      email: 'simon.riley@meditek.com',
      phone: '+1-555-0305',
      isActive: true,
    },
  ],
  doctors: [
    {
      personId: 'PER-000010',
      doctorId: 'DOC-000001',
      name: 'Dr. Robert Chen',
      email: 'robert.chen@meditek.com',
      phoneNumber: '+1-555-0201',
      dateOfBirth: '1975-06-15',
      gender: 'MALE',
      specialization: 'Cardiology',
      licenseNumber: 'MD-89211',
      departmentName: 'Cardiology Center',
      isActive: true
    },
    {
      personId: 'PER-000011',
      doctorId: 'DOC-000002',
      name: 'Dr. Sarah Connor',
      email: 'sarah.connor@meditek.com',
      phoneNumber: '+1-555-0202',
      dateOfBirth: '1982-03-24',
      gender: 'FEMALE',
      specialization: 'Neurology',
      licenseNumber: 'MD-94302',
      departmentName: 'Neuroscience Wing',
      isActive: true
    },
    {
      personId: 'PER-000012',
      doctorId: 'DOC-000003',
      name: 'Dr. Bruce Wayne',
      email: 'bruce.wayne@meditek.com',
      phoneNumber: '+1-555-0203',
      dateOfBirth: '1980-05-19',
      gender: 'MALE',
      specialization: 'Orthopedics',
      licenseNumber: 'MD-77401',
      departmentName: 'Orthopedic Unit',
      isActive: true
    }
  ],
  departments: [
    { departmentId: 'DEP-000001', departmentName: 'Emergency Theater Unit', location: 'Ground Floor Block A', subtype: 'ETU', detail: 'Level 1 Trauma' },
    { departmentId: 'DEP-000002', departmentName: 'Intensive Care Unit (ICU)', location: '2nd Floor Block B', subtype: 'ICU', detail: '24 Beds capacity' },
    { departmentId: 'DEP-000003', departmentName: 'Outpatient Department (OPD)', location: '1st Floor Block A', subtype: 'OPD', detail: '16 Consultation Rooms' },
    { departmentId: 'DEP-000004', departmentName: 'Central Pathology Laboratory', location: 'Basement 1 Block C', subtype: 'LABORATORY', detail: 'Clinical Pathology' },
    { departmentId: 'DEP-000005', departmentName: 'Central Pharmacy', location: 'Ground Floor Lobby', subtype: 'PHARMACY', detail: '24/7 Dispensing' },
    { departmentId: 'DEP-000006', departmentName: 'Diagnostic Radiology', location: '1st Floor Block C', subtype: 'RADIOLOGY', detail: 'MRI 3T, CT 128 Slice' },
    { departmentId: 'DEP-000007', departmentName: 'Operating Theaters (OR)', location: '3rd Floor Block B', subtype: 'OR', detail: 'Theater Suite 4' },
    { departmentId: 'DEP-000008', departmentName: 'Maternity & Neonatal Unit', location: '4th Floor Block A', subtype: 'MATERNITY', detail: 'Maternal Care' },
    { departmentId: 'DEP-000009', departmentName: 'Cardiology Center', location: '2nd Floor Block B', subtype: 'CARDIOLOGY', detail: 'Cardiac consultations and care' },
    { departmentId: 'DEP-000010', departmentName: 'Neuroscience Wing', location: '3rd Floor Block C', subtype: 'NEUROLOGY', detail: 'Neurology consultations and care' },
    { departmentId: 'DEP-000011', departmentName: 'Orthopedic Unit', location: '2nd Floor Block A', subtype: 'ORTHOPEDICS', detail: 'Orthopedic consultations and care' }
  ],
  wards: [
    { wardId: 'WRD-001', wardName: 'St. Jude General Ward', wardType: 'GENERAL', totalBeds: 3, occupiedBeds: 1 },
    { wardId: 'WRD-002', wardName: 'Cardiovascular Step-Down', wardType: 'CARDIAC', totalBeds: 2, occupiedBeds: 0 },
    { wardId: 'WRD-003', wardName: 'Pediatric Care Ward', wardType: 'PEDIATRIC', totalBeds: 1, occupiedBeds: 0 },
    { wardId: 'WRD-004', wardName: 'Surgical Recovery Unit', wardType: 'SURGICAL', totalBeds: 1, occupiedBeds: 0 }
  ],
  beds: [
    { bedId: 'BED-101', bedNumber: 'Bed 01', wardId: 'WRD-001', operationalStatus: 'AVAILABLE' },
    { bedId: 'BED-102', bedNumber: 'Bed 02', wardId: 'WRD-001', operationalStatus: 'AVAILABLE' },
    { bedId: 'BED-103', bedNumber: 'Bed 03', wardId: 'WRD-001', operationalStatus: 'MAINTENANCE' },
    { bedId: 'BED-201', bedNumber: 'Bed 01', wardId: 'WRD-002', operationalStatus: 'AVAILABLE' },
    { bedId: 'BED-202', bedNumber: 'Bed 02', wardId: 'WRD-002', operationalStatus: 'UNAVAILABLE' },
    { bedId: 'BED-301', bedNumber: 'Bed 01', wardId: 'WRD-003', operationalStatus: 'AVAILABLE' },
    { bedId: 'BED-401', bedNumber: 'Bed 01', wardId: 'WRD-004', operationalStatus: 'AVAILABLE' }
  ],
  medicines: [
    { medicineId: 'MED-001', name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 14.50, stock: 450 },
    { medicineId: 'MED-002', name: 'Paracetamol 650mg', category: 'Analgesic', price: 4.00, stock: 1200 },
    { medicineId: 'MED-003', name: 'Atorvastatin 20mg', category: 'Cardiovascular', price: 28.00, stock: 380 },
    { medicineId: 'MED-004', name: 'Metformin 500mg', category: 'Antidiabetic', price: 12.00, stock: 600 },
    { medicineId: 'MED-005', name: 'Pantoprazole 40mg', category: 'Antacid', price: 18.50, stock: 520 }
  ],
  bloodUnits: [
    { unitId: 'BLD-001', bloodBank: 'MediTek Central Bank', bloodType: 'O+', component: 'WHOLE_BLOOD', collectionDate: '2026-10-15', expirationDate: '2026-11-26', quantityMl: 450 },
    { unitId: 'BLD-002', bloodBank: 'MediTek Central Bank', bloodType: 'A+', component: 'WHOLE_BLOOD', collectionDate: '2026-10-18', expirationDate: '2026-11-29', quantityMl: 450 },
    { unitId: 'BLD-003', bloodBank: 'MediTek Central Bank', bloodType: 'B+', component: 'WHOLE_BLOOD', collectionDate: '2026-10-20', expirationDate: '2026-12-01', quantityMl: 450 },
    { unitId: 'BLD-004', bloodBank: 'MediTek Central Bank', bloodType: 'AB-', component: 'WHOLE_BLOOD', collectionDate: '2026-10-12', expirationDate: '2026-11-23', quantityMl: 450 }
  ],
  bloodIssues: [],
  bills: [
    { billId: 'BIL-001', patientPersonId: 'PER-000001', patientName: 'John Deo', amountTotal: 1250.00, status: 'PAID', issuedAt: '2026-10-25', paidAt: '2026-10-26' },
    { billId: 'BIL-002', patientPersonId: 'PER-000002', patientName: 'Jens Brincker', amountTotal: 840.50, status: 'PENDING', issuedAt: '2026-10-28', paidAt: null },
    { billId: 'BIL-003', patientPersonId: 'PER-000003', patientName: 'Elena Rostova', amountTotal: 3420.00, status: 'PENDING', issuedAt: '2026-10-30', paidAt: null }
  ],
  prescriptions: [
    { prescriptionId: 'RX-DEMO-001', patientPersonId: 'PER-000001', medicine: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: 'Every 8 hours for 7 days', doctorName: 'Dr. Robert Chen', issuedAt: '2026-10-25' },
    { prescriptionId: 'RX-DEMO-002', patientPersonId: 'PER-000001', medicine: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'As needed, up to 3 times daily', doctorName: 'Dr. Robert Chen', issuedAt: '2026-10-25' },
    { prescriptionId: 'RX-DEMO-003', patientPersonId: 'PER-000002', medicine: 'Atorvastatin 20mg', dosage: '1 tablet', frequency: 'Once daily', doctorName: 'Dr. Sarah Connor', issuedAt: '2026-10-28' }
  ],
  medicalRecords: [
    { recordId: 'REC-DEMO-001', patientPersonId: 'PER-000001', title: 'Post-operative review', summary: 'Recovery progressing as expected; follow-up consultation recommended.', provider: 'Dr. Robert Chen', recordDate: '2026-10-26' },
    { recordId: 'REC-DEMO-002', patientPersonId: 'PER-000001', title: 'Complete blood count', summary: 'Sample report for demonstration. Consult your care team for clinical interpretation.', provider: 'Central Pathology Laboratory', recordDate: '2026-10-25' },
    { recordId: 'REC-DEMO-003', patientPersonId: 'PER-000002', title: 'Neurology consultation', summary: 'Follow-up recommended in two weeks.', provider: 'Dr. Sarah Connor', recordDate: '2026-10-28' }
  ],
  labTests: [
    { testId: 'LAB-001', patientPersonId: 'PER-000001', orderedByPersonId: 'PER-000010', testType: 'Complete Blood Count (CBC) with Platelets', requestedAt: '2026-10-28T09:30:00Z', status: 'COMPLETED', reportId: 'REP-001', summary: 'Demo report; consult the care team for interpretation.' },
    { testId: 'LAB-002', patientPersonId: 'PER-000002', orderedByPersonId: 'PER-000011', testType: 'Lipid Profile & Serum Electrolytes', requestedAt: '2026-10-30T11:15:00Z', status: 'COMPLETED', reportId: 'REP-002', summary: 'Demo report; consult the care team for interpretation.' },
    { testId: 'LAB-003', patientPersonId: 'PER-000003', orderedByPersonId: 'PER-000012', testType: 'Serum Ferritin & Dengue Serology', requestedAt: '2026-10-31T08:00:00Z', status: 'PENDING', reportId: null, summary: null },
  ],
  theaters: [
    { theaterNumber: 'OT-101 (General)', department: 'Operating Theaters (OR)', status: 'ACTIVE IN SURGERY', currentPatientPersonId: 'PER-000001', procedure: 'Laparoscopic Appendectomy', surgeryDate: '2026-11-02T09:00:00' },
    { theaterNumber: 'OT-102 (Orthopedic)', department: 'Operating Theaters (OR)', status: 'AVAILABLE', currentPatientPersonId: null, procedure: '', surgeryDate: '' },
    { theaterNumber: 'OT-103 (Cardiac Suite)', department: 'Operating Theaters (OR)', status: 'SCHEDULED', currentPatientPersonId: 'PER-000003', procedure: 'Coronary Angioplasty', surgeryDate: '2026-11-03T14:00:00' },
    { theaterNumber: 'OT-104 (Trauma/Emergency)', department: 'Emergency Theater Unit', status: 'ON STANDBY', currentPatientPersonId: null, procedure: '', surgeryDate: '' },
  ],
  messages: [
    { id: 'MSG-001', sender: 'Dr. Robert Chen', role: 'Doctor', time: '10:45 AM', text: 'Sample handover: follow-up review is scheduled.', unread: false },
    { id: 'MSG-002', sender: 'Sister Clara Barton', role: 'Staff', time: '11:12 AM', text: 'Sample notice: ward supplies are ready for the afternoon shift.', unread: true },
    { id: 'MSG-003', sender: 'Dr. Sarah Connor', role: 'Doctor', time: '11:30 AM', text: 'Sample notice: a demo report is available for review.', unread: true },
  ],
};

try {
  const savedPatients = JSON.parse(localStorage.getItem(DEMO_PATIENTS_KEY) || 'null');
  if (Array.isArray(savedPatients)) {
    mockStore.patients = [
      ...mockStore.patients.filter((patient) => !savedPatients.some((saved) => saved.personId === patient.personId)),
      ...savedPatients,
    ];
  }
} catch (error) {
  throw new Error(`Unable to read saved demo patients: ${error.message}`);
}

if (USE_MOCKS) {
  const savedDemoAccounts = getDemoAccounts();
  let changedAccountIds = false;
  for (const account of savedDemoAccounts) {
    if (!account.personId) {
      account.personId = `PER-DEMO-${account.accountId.slice(-8)}`;
      changedAccountIds = true;
    }
    if (account.role === 'DOCTOR' && !mockStore.doctors.some((doctor) => doctor.personId === account.personId)) {
      mockStore.doctors.unshift({
        personId: account.personId,
        doctorId: `DOC-${account.accountId.slice(-8)}`,
        name: account.fullName,
        email: account.email,
        phoneNumber: account.phoneNumber,
        specialization: account.specialization,
        departmentId: account.departmentId,
        departmentName: account.department,
        isActive: account.isActive,
        isDemoAccount: true,
      });
    }
    if (account.role === 'STAFF' && !mockStore.staff.some((staff) => staff.personId === account.personId)) {
      mockStore.staff.unshift({
        personId: account.personId,
        staffId: `STF-${account.accountId.slice(-8)}`,
        name: account.fullName,
        role: account.designation,
        subtype: account.designation,
        department: account.department,
        email: account.email,
        phone: account.phoneNumber,
        isActive: account.isActive,
        isDemoAccount: true,
      });
    }
  }
  if (changedAccountIds) saveDemoAccounts(savedDemoAccounts);
}

export const STAFF_DESIGNATION_TYPES = Object.freeze([
  'Nurse',
  'Receptionist',
  'Pharmacist',
  'Laboratory Technician',
  'Billing Officer',
]);

function getMockAvailableBeds(wardId) {
  const activeBedIds = new Set(
    mockStore.admissions
      .filter((admission) => admission.status === 'ACTIVE')
      .map((admission) => admission.bedId)
  );
  return mockStore.beds.filter((bed) => (
    bed.wardId === wardId
    && bed.operationalStatus === 'AVAILABLE'
    && !activeBedIds.has(bed.bedId)
  ));
}

export const api = {
  // Authentication
  login: async (credentials) => {
    const demoUsers = {
      admin: { name: 'Guy Hawkins', role: 'SUPER_ADMIN' },
      doctor: { name: 'Dr. Sarah Connor', role: 'DOCTOR', personId: 'PER-000011' },
      staff: { name: 'Sister Clara Barton', role: 'STAFF', personId: 'STF-000001' },
      patient: { name: 'John Deo', role: 'PATIENT', personId: 'PER-000001' },
    };
    let response;
    if (USE_MOCKS) {
      const username = sanitizeUsername(credentials.username);
      const managedAccount = getDemoAccounts().find((account) => account.username === username);
      let demoUser;
      if (managedAccount) {
        if (!managedAccount.isActive) throw new Error('This development demo account has been deactivated.');
        if (!(await matchesPassword(credentials.password, managedAccount))) {
          throw new Error('Invalid demo username or password.');
        }
        demoUser = {
          username: managedAccount.username,
          name: managedAccount.fullName,
          role: managedAccount.role,
          personId: managedAccount.personId,
          accountId: managedAccount.accountId,
          mustChangePassword: managedAccount.mustChangePassword,
          isDemoAccount: true,
        };
      } else {
        const demoRole = demoUsers[username];
        if (!demoRole || credentials.password !== '') {
          throw new Error('Choose a demo role or enter credentials for a created demo account.');
        }
        demoUser = { username, ...demoRole, isDemoAccount: true };
      }
      response = { token: MOCK_TOKEN, user: demoUser };
    } else {
      response = (await apiClient.post('/auth/login', credentials)).data;
    }
    const user = response.user || {
      username: response.username,
      name: response.name || response.username,
      role: response.role,
      designation: response.designation,
      personId: response.personId,
      mustChangePassword: response.passwordChangeRequired,
    };
    if (!response.token || !user.username) {
      throw new Error('The authentication response did not include a valid user session.');
    }
    localStorage.setItem('meditek_token', response.token);
    localStorage.setItem('meditek_user', JSON.stringify(user));
    localStorage.setItem(AUTH_MODE_KEY, USE_MOCKS ? 'mock' : 'live');
    return { ...response, user };
  },

  registerPatient: async (registrationData) => {
    let response;
    if (USE_MOCKS) {
      throw new Error('Patient self-registration requires live backend connectivity.');
    } else {
      response = (await apiClient.post('/auth/register', registrationData)).data;
    }
    const user = response.user || {
      username: response.username,
      name: response.name || response.username,
      role: response.role,
      designation: response.designation || (response.username === 'meditek_pharma' ? 'Pharmacist' : null),
      personId: response.personId,
      mustChangePassword: response.passwordChangeRequired,
    };
    if (!response.token || !user.username) {
      throw new Error('Registration succeeded but session could not be established.');
    }
    localStorage.setItem('meditek_token', response.token);
    localStorage.setItem('meditek_user', JSON.stringify(user));
    localStorage.setItem(AUTH_MODE_KEY, 'live');
    return { ...response, user };
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('meditek_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        localStorage.removeItem('meditek_user');
        return null;
      }
    }
    return null;
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('meditek_token');
    const authMode = localStorage.getItem(AUTH_MODE_KEY);
    const expectedMode = USE_MOCKS ? 'mock' : 'live';
    if ((authMode && authMode !== expectedMode) || (!USE_MOCKS && token === MOCK_TOKEN)) {
      api.logout();
      return false;
    }
    const user = api.getCurrentUser();
    if (USE_MOCKS && user?.isDemoAccount && user.accountId) {
      const account = getDemoAccounts().find((item) => item.accountId === user.accountId);
      if (!account?.isActive) {
        api.logout();
        return false;
      }
    }
    return Boolean(token && user);
  },

  isMockMode: () => USE_MOCKS,

  getCurrentRole: () => {
    const user = api.getCurrentUser();
    return normalizeRole(user?.role, user);
  },

  getCurrentDesignation: () => {
    const user = api.getCurrentUser();
    if (user?.designation) return user.designation;
    if (user?.username === 'meditek_pharma') return 'Pharmacist';
    return null;
  },

  getApiBaseUrl: () => API_BASE_URL,

  isModuleAvailable: (module) => ({
    dashboard: true,
    patients: true,
    doctors: true,
    departments: true,
    appointments: true,
    admissions: true,
    staff: true,
    wards: true,
    pharmacy: true,
    laboratory: true,
    surgeries: true,
    bloodBank: true,
    billing: true,
    medicalRecords: true,
    messages: false,
    settings: false,
  })[module] === true,

  getErrorMessage: (error, fallback = 'The request could not be completed.') => {
    if (!error) return fallback;
    const response = error.response;
    const data = response?.data;
    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const details = Object.entries(data.fieldErrors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      if (details) {
        return `${data.message || 'Validation failed'} — ${details}`;
      }
    }
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (data?.message) {
      return data.message;
    }
    if (data?.error) {
      return data.error;
    }
    if (response?.status === 403) {
      return 'You do not have permission to perform this action (403 Forbidden).';
    }
    if (response?.status === 404) {
      return 'The requested resource was not found on the server (404 Not Found).';
    }
    if (response?.status === 409) {
      return 'The request conflicts with existing data in the database (409 Conflict).';
    }
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return 'Network connection failure. Please verify the MediTek backend is running on port 8080.';
    }
    return error.message || fallback;
  },

  logout: () => {
    localStorage.removeItem('meditek_token');
    localStorage.removeItem('meditek_user');
    localStorage.removeItem(AUTH_MODE_KEY);
  },

  generateDemoUsername: (fullName) => {
    requireDemoAdmin();
    const reserved = new Set(['admin', 'doctor', 'staff', 'patient']);
    const existing = new Set(getDemoAccounts().map((account) => account.username));
    const base = sanitizeUsername(fullName)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'demo.user';
    let candidate = base;
    let suffix = 1;
    while (reserved.has(candidate) || existing.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  },

  generateDemoTemporaryPassword: async () => {
    requireDemoAdmin();
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-';
    const upperBound = Math.floor(256 / alphabet.length) * alphabet.length;
    const accounts = getDemoAccounts();
    let password;
    do {
      password = '';
      while (password.length < 24) {
        const bytes = randomBytes(32);
        for (const byte of bytes) {
          if (byte >= upperBound) continue;
          password += alphabet[byte % alphabet.length];
          if (password.length === 24) break;
        }
      }
    } while (await passwordAlreadyUsed(password, accounts));
    return password;
  },

  listDemoAccounts: () => {
    requireDemoAdmin();
    return Promise.resolve(getDemoAccounts()
      .filter((account) => ['DOCTOR', 'STAFF'].includes(account.role))
      .map(publicDemoAccount));
  },

  createDemoAccount: async (details) => {
    requireDemoAdmin();
    if (!['DOCTOR', 'STAFF'].includes(details.role)) {
      throw new Error('Only Doctor and Staff demo accounts can be created.');
    }
    if (!details.fullName?.trim() || !details.email?.trim() || !details.phoneNumber?.trim()
      || !details.departmentId?.trim() || !details.username?.trim() || !details.password) {
      throw new Error('Complete all required demo account fields.');
    }
    const department = mockStore.departments.find((item) => item.departmentId === details.departmentId);
    if (!department) throw new Error('Select a department from the current department directory.');
    if (details.password.length < 16) throw new Error('Temporary passwords must contain at least 16 characters.');
    if (details.role === 'DOCTOR' && !details.specialization?.trim()) {
      throw new Error('Doctor accounts require a specialization.');
    }
    if (details.role === 'STAFF' && !STAFF_DESIGNATION_TYPES.includes(details.designation)) {
      throw new Error('Staff accounts require a designation or type.');
    }
    if (details.role === 'DOCTOR'
      && !(await api.getDoctorSpecializations(details.departmentId)).includes(details.specialization)) {
      throw new Error('Select a specialization associated with the selected department.');
    }
    const accounts = getDemoAccounts();
    const username = sanitizeUsername(details.username);
    if (!username || ['admin', 'doctor', 'staff', 'patient'].includes(username)
      || accounts.some((account) => account.username === username)) {
      throw new Error('That username is already in use. Generate a unique username and try again.');
    }
    if (await passwordAlreadyUsed(details.password, accounts)) {
      throw new Error('Temporary passwords must be unique for each demo account. Generate a new password.');
    }
    const passwordSalt = toHex(randomBytes(16));
    const account = {
      accountId: `DEMO-${toHex(randomBytes(8))}`,
      role: details.role,
      fullName: details.fullName.trim(),
      email: details.email.trim(),
      phoneNumber: details.phoneNumber.trim(),
      departmentId: department.departmentId,
      department: department.departmentName,
      ...(details.role === 'DOCTOR'
        ? { specialization: details.specialization.trim() }
        : { designation: details.designation.trim() }),
      username,
      passwordHash: await hashPassword(details.password, passwordSalt),
      passwordSalt,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    account.personId = `PER-DEMO-${account.accountId.slice(-8)}`;
    accounts.push(account);
    saveDemoAccounts(accounts);
    if (account.role === 'DOCTOR') {
      mockStore.doctors.unshift({
        personId: account.personId,
        doctorId: `DOC-${account.accountId.slice(-8)}`,
        name: account.fullName,
        email: account.email,
        phoneNumber: account.phoneNumber,
        specialization: account.specialization,
        departmentId: account.departmentId,
        departmentName: account.department,
        isActive: true,
        isDemoAccount: true,
      });
    } else {
      mockStore.staff.unshift({
        personId: account.personId,
        staffId: `STF-${account.accountId.slice(-8)}`,
        name: account.fullName,
        role: account.designation,
        subtype: account.designation,
        department: account.department,
        email: account.email,
        phone: account.phoneNumber,
        isActive: true,
        isDemoAccount: true,
      });
    }
    return publicDemoAccount(account);
  },

  updateDemoAccount: async (accountId, changes) => {
    requireDemoAdmin();
    const accounts = getDemoAccounts();
    const index = accounts.findIndex((account) => account.accountId === accountId);
    if (index < 0) throw new Error('Demo account was not found.');
    const current = accounts[index];
    const department = mockStore.departments.find((item) => item.departmentId === changes.departmentId);
    if (!department) throw new Error('Select a department from the current department directory.');
    if (current.role === 'STAFF' && !STAFF_DESIGNATION_TYPES.includes(changes.designation)) {
      throw new Error('Select a staff designation from the configured options.');
    }
    if (current.role === 'DOCTOR'
      && !(await api.getDoctorSpecializations(changes.departmentId)).includes(changes.specialization)) {
      throw new Error('Select a specialization associated with the selected department.');
    }
    accounts[index] = {
      ...current,
      fullName: changes.fullName.trim(),
      email: changes.email.trim(),
      phoneNumber: changes.phoneNumber.trim(),
      departmentId: department.departmentId,
      department: department.departmentName,
      ...(current.role === 'DOCTOR'
        ? { specialization: changes.specialization.trim() }
        : { designation: changes.designation.trim() }),
    };
    saveDemoAccounts(accounts);
    const updated = accounts[index];
    if (updated.role === 'DOCTOR') {
      const doctor = mockStore.doctors.find((item) => item.personId === updated.personId);
      if (doctor) Object.assign(doctor, {
        name: updated.fullName,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
        departmentId: updated.departmentId,
        departmentName: updated.department,
        specialization: updated.specialization,
      });
    } else {
      const staff = mockStore.staff.find((item) => item.personId === updated.personId);
      if (staff) Object.assign(staff, {
        name: updated.fullName,
        email: updated.email,
        phone: updated.phoneNumber,
        department: updated.department,
        role: updated.designation,
        subtype: updated.designation,
      });
    }
    return publicDemoAccount(updated);
  },

  deactivateDemoAccount: (accountId) => {
    requireDemoAdmin();
    const accounts = getDemoAccounts();
    const account = accounts.find((item) => item.accountId === accountId);
    if (!account || !['DOCTOR', 'STAFF'].includes(account.role)) throw new Error('Doctor or Staff demo account was not found.');
    account.isActive = false;
    const directoryEntry = account.role === 'DOCTOR'
      ? mockStore.doctors.find((item) => item.personId === account.personId)
      : mockStore.staff.find((item) => item.personId === account.personId);
    if (directoryEntry) directoryEntry.isActive = false;
    saveDemoAccounts(accounts);
    return publicDemoAccount(account);
  },

  activateDemoAccount: (accountId) => {
    requireDemoAdmin();
    const accounts = getDemoAccounts();
    const account = accounts.find((item) => item.accountId === accountId);
    if (!account || !['DOCTOR', 'STAFF'].includes(account.role)) throw new Error('Doctor or Staff demo account was not found.');
    account.isActive = true;
    const directoryEntry = account.role === 'DOCTOR'
      ? mockStore.doctors.find((item) => item.personId === account.personId)
      : mockStore.staff.find((item) => item.personId === account.personId);
    if (directoryEntry) directoryEntry.isActive = true;
    saveDemoAccounts(accounts);
    return publicDemoAccount(account);
  },

  changeDemoPassword: async (newPassword) => {
    if (!USE_MOCKS) throw new Error('Demo password changes are only available in development mock mode.');
    const user = api.getCurrentUser();
    if (!user?.isDemoAccount || !user.accountId) throw new Error('This account does not require a demo password change.');
    const accounts = getDemoAccounts();
    const account = accounts.find((item) => item.accountId === user.accountId);
    if (!account || !account.isActive) throw new Error('The demo account is unavailable.');
    if (!newPassword || newPassword.length < 12) throw new Error('Choose a password with at least 12 characters.');
    if (await matchesPassword(newPassword, account)) throw new Error('Choose a new password different from the temporary password.');
    if (await passwordAlreadyUsed(newPassword, accounts, account.accountId)) {
      throw new Error('Passwords must be unique between demo accounts. Choose another password.');
    }
    const passwordSalt = toHex(randomBytes(16));
    account.passwordHash = await hashPassword(newPassword, passwordSalt);
    account.passwordSalt = passwordSalt;
    account.mustChangePassword = false;
    saveDemoAccounts(accounts);
    const updatedUser = { ...user, mustChangePassword: false };
    localStorage.setItem('meditek_user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  changePassword: async (currentPassword, newPassword) => {
    if (USE_MOCKS) return api.changeDemoPassword(newPassword);
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    const user = api.getCurrentUser();
    if (user) {
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem('meditek_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('meditek_user_updated'));
    }
  },

  getProfile: async () => {
    if (USE_MOCKS) {
      const user = api.getCurrentUser() || {};
      return {
        username: user.username,
        name: user.name || user.username,
        email: user.email || `${user.username}@meditek.local`,
        phoneNumber: user.phoneNumber || '',
        role: user.role || 'USER',
        designation: user.designation || '',
        profileImage: user.profileImage || null,
      };
    }
    const response = await apiClient.get('/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    if (USE_MOCKS) {
      const user = api.getCurrentUser() || {};
      const updatedUser = {
        ...user,
        name: data.name !== undefined ? data.name : user.name,
        email: data.email !== undefined ? data.email : user.email,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : user.phoneNumber,
        profileImage: data.profileImage !== undefined ? data.profileImage : user.profileImage,
      };
      localStorage.setItem('meditek_user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('meditek_user_updated'));
      return updatedUser;
    }
    const response = await apiClient.put('/profile', data);
    const profile = response.data;
    const user = api.getCurrentUser() || {};
    const updatedUser = {
      ...user,
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      profileImage: profile.profileImage,
    };
    localStorage.setItem('meditek_user', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('meditek_user_updated'));
    return profile;
  },

  // Dashboard endpoints
  getDashboardStats: () => requestOrMock(
    () => mockStore.stats,
    () => apiClient.get('/dashboard/stats')
  ),

  getPatientChartData: () => requestOrMock(
    () => mockStore.patientDistributions,
    () => apiClient.get('/dashboard/patient-chart')
  ),

  getOperations: () => requestOrMock(
    () => mockStore.operations,
    () => unavailable('Surgery scheduling')
  ),

  getAppointments: () => requestOrMock(
    () => [...mockStore.appointments],
    () => apiClient.get('/appointments')
  ),

  getPatientPortalData: () => {
    if (USE_MOCKS) {
      const user = api.getCurrentUser();
      const patient = mockStore.patients.find((item) => item.personId === user?.personId);
      if (!patient) return Promise.reject(new Error('No demo patient profile is associated with this session.'));
      return Promise.resolve({
        patient,
        appointments: mockStore.appointments.filter((item) => (
          item.patientPersonId === patient.personId || item.patientName === patient.name
        )),
        prescriptions: mockStore.prescriptions.filter((item) => item.patientPersonId === patient.personId),
        bills: mockStore.bills.filter((item) => item.patientPersonId === patient.personId)
          .map((bill) => normalizeDemoBill(bill, patient)),
        records: mockStore.medicalRecords.filter((item) => item.patientPersonId === patient.personId),
      });
    }
    return Promise.all([
      apiClient.get('/patients/me'),
      apiClient.get('/appointments'),
      apiClient.get('/prescriptions'),
      api.getBills(),
      api.getMedicalRecords(),
      apiClient.get('/lab-tests').then((res) => res.data).catch(() => []),
    ]).then(([patient, appointments, prescriptions, bills, records, labs]) => ({
      patient: patient.data,
      appointments: appointments.data,
      prescriptions: prescriptions.data.map((prescription) => ({
        ...prescription,
        medicine: (prescription.items || []).map((item) => item.medicineName).join(', '),
        dosage: (prescription.items || []).map((item) => item.dosage).join(', '),
        frequency: (prescription.items || []).map((item) => item.frequency).join(', '),
        issuedAt: prescription.prescriptionDate,
      })),
      bills,
      records,
      labs: Array.isArray(labs) ? labs : [],
    }));
  },

  createAppointment: (appointment) => requestOrMock(
    () => {
      const currentUser = api.getCurrentUser();
      const role = api.getCurrentRole();
      const patientPersonId = role === 'PATIENT' ? currentUser.personId : appointment.patientPersonId;
      if (role === 'DOCTOR' || role === 'STAFF') {
        throw new Error('Only patients and Super Admin can book demo appointments.');
      }
      const patient = mockStore.patients.find((item) => item.personId === patientPersonId);
      const doctor = mockStore.doctors.find((item) => item.personId === appointment.doctorPersonId);
      if (!patient || !doctor || doctor.isActive === false) {
        throw new Error('Select an active patient and doctor from the current demo directory.');
      }
      if (role === 'PATIENT' && !appointment.notes?.trim()) {
        throw new Error('Enter a reason for your appointment.');
      }
      const appointmentTimestamp = new Date(appointment.appointmentDate).getTime();
      if (!appointment.appointmentDate || Number.isNaN(appointmentTimestamp) || appointmentTimestamp <= Date.now()) {
        throw new Error('Choose a valid future appointment date and time.');
      }
      const created = {
        appointmentId: `APT-DEMO-${Date.now()}`,
        ...appointment,
        patientPersonId,
        patientName: patient?.name || '',
        doctorName: doctor?.name || '',
        date: appointment.appointmentDate,
        status: 'SCHEDULED',
      };
      mockStore.appointments.unshift(created);
      return created;
    },
    () => apiClient.post('/appointments', appointment)
  ),

  updateAppointmentStatus: (appointmentId, status) => requestOrMock(
    () => {
      requireDemoRole(['DOCTOR']);
      const appointment = mockStore.appointments.find(
        (item) => (item.appointmentId || item.id) === appointmentId
      );
      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} was not found.`);
      }
      const user = api.getCurrentUser();
      if (appointment.doctorPersonId !== user?.personId) {
        throw new Error('Doctors can update only appointments assigned to their own profile.');
      }
      if (!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
        throw new Error('Choose a supported appointment status.');
      }
      appointment.status = status;
      return appointment;
    },
    () => apiClient.patch(`/appointments/${encodeURIComponent(appointmentId)}/status`, null, {
      params: { status },
    })
  ),

  getActiveAdmissions: () => requestOrMock(
    () => mockStore.admissions.filter((admission) => admission.status === 'ACTIVE'),
    () => apiClient.get('/admissions/active')
  ),

  admitPatient: (admission) => requestOrMock(
    () => {
      requireDemoRole(['ADMIN', 'STAFF']);
      const selectedBed = mockStore.beds.find((bed) => (
        bed.bedId === admission.bedId
        && bed.wardId === admission.wardId
        && bed.operationalStatus === 'AVAILABLE'
      ));
      if (!selectedBed || !getMockAvailableBeds(admission.wardId).some((bed) => bed.bedId === admission.bedId)) {
        throw new Error('Selected bed is not operationally available. Refresh the bed list and choose another bed.');
      }
      const active = mockStore.admissions.filter((item) => item.status === 'ACTIVE');
      if (active.some((item) => item.bedId === admission.bedId)) {
        throw new Error('Bed is already assigned to an active admission.');
      }
      if (active.some((item) => item.patientPersonId === admission.patientPersonId)) {
        throw new Error('Patient already has an active admission.');
      }
      const patient = mockStore.patients.find((item) => item.personId === admission.patientPersonId);
      const doctor = mockStore.doctors.find((item) => item.personId === admission.admittingDoctorPersonId);
      const created = {
        ...admission,
        bedNumber: selectedBed.bedNumber,
        wardName: mockStore.wards.find((ward) => ward.wardId === admission.wardId)?.wardName || '',
        admissionId: `ADM-DEMO-${Date.now()}`,
        patientName: patient?.name || '',
        admittingDoctorName: doctor?.name || '',
        admissionDate: new Date().toISOString(),
        status: 'ACTIVE',
      };
      mockStore.admissions.unshift(created);
      return created;
    },
    () => {
      const { patientPersonId, bedId, admittingDoctorPersonId, reason } = admission;
      return apiClient.post('/admissions', {
        patientPersonId,
        bedId,
        admittingDoctorPersonId,
        reason,
      });
    }
  ),

  transferAdmission: (currentAdmissionId, targetBedId, reason) => requestOrMock(
    () => {
      requireDemoRole(['ADMIN', 'STAFF']);
      const current = mockStore.admissions.find(
        (item) => item.admissionId === currentAdmissionId && item.status === 'ACTIVE'
      );
      if (!current) {
        throw new Error(`Active admission ${currentAdmissionId} was not found.`);
      }
      if (!getMockAvailableBeds(mockStore.beds.find((bed) => bed.bedId === targetBedId)?.wardId)
        .some((bed) => bed.bedId === targetBedId)) {
        throw new Error('Target bed is not operationally available. Refresh the bed list and choose another bed.');
      }
      if (mockStore.admissions.some(
        (item) => item.status === 'ACTIVE' && item.bedId === targetBedId
      )) {
        throw new Error('Target bed is already assigned to an active admission.');
      }
      current.status = 'TRANSFERRED';
      current.dischargeDate = new Date().toISOString();
      const transferred = {
        ...current,
        admissionId: `ADM-DEMO-${Date.now()}`,
        bedId: targetBedId,
        bedNumber: mockStore.beds.find((bed) => bed.bedId === targetBedId)?.bedNumber || targetBedId,
        wardId: mockStore.beds.find((bed) => bed.bedId === targetBedId)?.wardId,
        wardName: mockStore.wards.find((ward) => ward.wardId === mockStore.beds.find((bed) => bed.bedId === targetBedId)?.wardId)?.wardName || '',
        admissionDate: new Date().toISOString(),
        dischargeDate: null,
        status: 'ACTIVE',
        reason: reason || current.reason,
        transferFromAdmissionId: currentAdmissionId,
      };
      mockStore.admissions.unshift(transferred);
      return transferred;
    },
    () => apiClient.post('/admissions/transfer', {
      currentAdmissionId,
      targetBedId,
      reason,
    })
  ),

  dischargeAdmission: (admissionId) => requestOrMock(
    () => {
      requireDemoRole(['ADMIN', 'STAFF', 'DOCTOR']);
      const admission = mockStore.admissions.find(
        (item) => item.admissionId === admissionId && item.status === 'ACTIVE'
      );
      if (!admission) {
        throw new Error(`Active admission ${admissionId} was not found.`);
      }
      admission.status = 'DISCHARGED';
      admission.dischargeDate = new Date().toISOString();
      return admission;
    },
    () => apiClient.post(`/admissions/${encodeURIComponent(admissionId)}/discharge`)
  ),

  // Patients
  getPatients: () => requestOrMock(
    () => [...mockStore.patients],
    () => apiClient.get('/patients')
  ),

  getPatient: (patientId) => requestOrMock(
    () => {
      const patient = mockStore.patients.find((item) => item.patientId === patientId || item.personId === patientId);
      if (!patient) throw new Error(`Patient ${patientId} was not found.`);
      return patient;
    },
    () => apiClient.get(`/patients/${encodeURIComponent(patientId)}`)
  ),
  getCurrentPatient: () => (
    USE_MOCKS
      ? Promise.resolve(mockStore.patients.find((patient) => patient.personId === api.getCurrentUser()?.personId))
      : apiClient.get('/patients/me').then((response) => response.data)
  ),

  createPatient: (patientData) => requestOrMock(
    () => {
      requireDemoRole(['ADMIN', 'STAFF']);
      let nextId = toHex(randomBytes(6)).toUpperCase();
      while (mockStore.patients.some((item) => item.patientId === `PAT-DEMO-${nextId}`)) {
        nextId = toHex(randomBytes(6)).toUpperCase();
      }
      const newPatient = {
        personId: `PER-DEMO-${nextId}`,
        patientId: `PAT-DEMO-${nextId}`,
        ...patientData,
        isActive: true
      };
      mockStore.patients.push(newPatient);
      localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(mockStore.patients.filter((item) => item.patientId.startsWith('PAT-DEMO-'))));
      return newPatient;
    },
    () => apiClient.post('/patients', patientData).then(({ data }) => {
      if (!data.patient) return data;
      return {
        ...data.patient,
        credentials: {
          username: data.username,
          password: data.temporaryPassword,
        },
      };
    })
  ),

  registerDemoPatient: async (patientData) => {
    requireDemoRole(['STAFF']);
    requireWebCrypto();
    if (!patientData.name?.trim() || !patientData.email?.trim() || !patientData.dateOfBirth
      || !patientData.phoneNumber?.trim() || !patientData.address?.trim()) {
      throw new Error('Complete all required patient registration fields.');
    }
    const accounts = getDemoAccounts();
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-';
    const upperBound = Math.floor(256 / alphabet.length) * alphabet.length;
    let password;
    do {
      password = '';
      for (const byte of randomBytes(64)) {
        if (byte >= upperBound) continue;
        password += alphabet[byte % alphabet.length];
        if (password.length === 20) break;
      }
    } while (await passwordAlreadyUsed(password, accounts));
    const patient = await api.createPatient(patientData);
    const username = patient.patientId.toLowerCase();
    const passwordSalt = toHex(randomBytes(16));
    const account = {
      accountId: `DEMO-${toHex(randomBytes(8))}`,
      personId: patient.personId,
      role: 'PATIENT',
      username,
      fullName: patient.name,
      passwordHash: await hashPassword(password, passwordSalt),
      passwordSalt,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    saveDemoAccounts(accounts);
    return { patient, credentials: { username, password } };
  },

  deletePatient: (patientId) => requestOrMock(
    () => {
      const index = mockStore.patients.findIndex((item) => item.patientId === patientId);
      if (index < 0) throw new Error(`Patient ${patientId} was not found.`);
      mockStore.patients.splice(index, 1);
      return null;
    },
    () => apiClient.delete(`/patients/${encodeURIComponent(patientId)}`)
  ),

  // Doctors
  getDoctors: () => requestOrMock(
    () => mockStore.doctors.filter((doctor) => doctor.isActive !== false),
    () => apiClient.get('/doctors').then((response) => response.data.filter((doctor) => doctor.isActive !== false))
  ),

  getManagedDoctors: () => requestOrMock(
    () => [...mockStore.doctors],
    () => apiClient.get('/doctors')
  ),

  createDoctor: (doctor) => requestOrMock(
    () => {
      const created = {
        ...doctor,
        personId: `PER-DEMO-${Date.now()}`,
        doctorId: `DOC-DEMO-${Date.now()}`,
      };
      mockStore.doctors.unshift(created);
      return created;
    },
    () => apiClient.post('/doctors', doctor)
  ),

  createStaff: (staff) => (
    USE_MOCKS
      ? Promise.reject(new Error('Use the demo account workflow to create Staff while mock mode is enabled.'))
      : apiClient.post('/staff', staff).then((response) => response.data)
  ),

  getDoctor: (doctorId) => requestOrMock(
    () => {
      const doctor = mockStore.doctors.find((item) => item.doctorId === doctorId || item.personId === doctorId);
      if (!doctor) throw new Error(`Doctor ${doctorId} was not found.`);
      return doctor;
    },
    () => apiClient.get(`/doctors/${encodeURIComponent(doctorId)}`)
  ),

  setDoctorActive: (doctorId, active) => apiClient.patch(
    `/doctors/${encodeURIComponent(doctorId)}/status`,
    null,
    { params: { active } }
  ).then((response) => response.data),

  deleteDoctor: (doctorId) => requestOrMock(
    () => {
      const idx = mockStore.doctors.findIndex((d) => d.doctorId === doctorId);
      if (idx >= 0) mockStore.doctors.splice(idx, 1);
      return null;
    },
    () => apiClient.delete(`/doctors/${encodeURIComponent(doctorId)}`).then((r) => r.data)
  ),

  resendDoctorActivation: (doctorId) => apiClient.post(
    `/doctors/${encodeURIComponent(doctorId)}/resend-activation`
  ).then((response) => response.data),

  verifyActivationToken: (token) => apiClient.get(
    '/auth/verify-activation-token',
    { params: { token } }
  ).then((response) => response.data),

  activateDoctorAccount: (token, password) => apiClient.post(
    '/auth/activate-doctor',
    { token, password }
  ).then((response) => response.data),

  getStaff: () => requestOrMock(
    () => mockStore.staff.filter((staff) => staff.isActive !== false),
    () => apiClient.get('/staff')
  ),

  getManagedStaff: () => requestOrMock(
    () => [...mockStore.staff],
    () => apiClient.get('/staff')
  ),

  setStaffActive: (staffId, active) => apiClient.patch(
    `/staff/${encodeURIComponent(staffId)}/status`,
    null,
    { params: { active } }
  ).then((response) => response.data),

  deleteStaff: (staffId) => requestOrMock(
    () => {
      const idx = mockStore.staff.findIndex((s) => s.staffId === staffId);
      if (idx >= 0) mockStore.staff.splice(idx, 1);
      return null;
    },
    () => apiClient.delete(`/staff/${encodeURIComponent(staffId)}`).then((r) => r.data)
  ),

  updatePatientProfile: (changes) => {
    if (!USE_MOCKS) return unavailable('Patient profile updates');
    const user = api.getCurrentUser();
    if (api.getCurrentRole() !== 'PATIENT') throw new Error('Only the signed-in patient can update their profile.');
    const patient = mockStore.patients.find((item) => item.personId === user?.personId);
    if (!patient) throw new Error('Patient profile was not found.');
    for (const key of ['phoneNumber', 'address', 'emergencyContact']) {
      if (typeof changes[key] !== 'string' || !changes[key].trim()) {
        throw new Error(`Enter a valid ${key === 'phoneNumber' ? 'phone number' : key}.`);
      }
      patient[key] = changes[key].trim();
    }
    localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(mockStore.patients.filter((item) => item.patientId.startsWith('PAT-DEMO-'))));
    return Promise.resolve(patient);
  },

  updateOwnDoctorProfile: (changes) => {
    if (!USE_MOCKS) return unavailable('Doctor profile updates');
    requireDemoRole(['DOCTOR']);
    const user = api.getCurrentUser();
    const doctor = mockStore.doctors.find((item) => item.personId === user?.personId);
    if (!doctor) throw new Error('Your demo doctor profile was not found.');
    if (!changes.name?.trim() || !changes.email?.trim() || !changes.phoneNumber?.trim()) {
      throw new Error('Name, email, and phone number are required.');
    }
    Object.assign(doctor, {
      name: changes.name.trim(),
      email: changes.email.trim(),
      phoneNumber: changes.phoneNumber.trim(),
    });
    const accounts = getDemoAccounts();
    const account = accounts.find((item) => item.accountId === user.accountId);
    if (account) {
      account.fullName = doctor.name;
      account.email = doctor.email;
      account.phoneNumber = doctor.phoneNumber;
      saveDemoAccounts(accounts);
    }
    if (user) localStorage.setItem('meditek_user', JSON.stringify({ ...user, name: doctor.name }));
    return Promise.resolve(doctor);
  },

  // Departments
  getDepartments: () => requestOrMock(
    () => mockStore.departments,
    () => apiClient.get('/departments')
  ),

  createDepartment: (department) => requestOrMock(
    () => {
      const created = { ...department, departmentId: `DEP-DEMO-${Date.now()}` };
      mockStore.departments.unshift(created);
      return created;
    },
    () => apiClient.post('/departments', department)
  ),

  deleteDepartment: (departmentId) => requestOrMock(
    () => {
      const index = mockStore.departments.findIndex((item) => item.departmentId === departmentId);
      if (index < 0) throw new Error(`Department ${departmentId} was not found.`);
      mockStore.departments.splice(index, 1);
      return null;
    },
    () => apiClient.delete(`/departments/${encodeURIComponent(departmentId)}`)
  ),

  // Wards & Beds
  getWards: () => requestOrMock(
    () => mockStore.wards,
    () => apiClient.get('/wards')
  ),
  createWard: (payload) => requestOrMock(
    () => {
      const created = { wardId: 'WRD-DEMO-' + Date.now(), wardName: payload.wardName, wardType: payload.wardType, totalBeds: 0, availableBeds: 0, occupiedBeds: 0, maintenanceBeds: 0, unavailableBeds: 0, departmentId: payload.departmentId || null };
      mockStore.wards.push(created);
      return created;
    },
    () => apiClient.post('/wards', payload).then((res) => res.data)
  ),
  getBeds: () => requestOrMock(
    () => mockStore.beds,
    () => apiClient.get('/beds')
  ),
  createBed: (payload) => requestOrMock(
    () => {
      const created = { bedId: 'BED-DEMO-' + Date.now(), wardId: payload.wardId, bedNumber: payload.bedNumber || ('B-' + Date.now().toString().slice(-4)), operationalStatus: 'AVAILABLE', availabilityStatus: 'AVAILABLE', currentAdmission: null };
      mockStore.beds.push(created);
      return created;
    },
    () => apiClient.post('/beds', payload).then((res) => res.data)
  ),
  getAvailableBeds: (wardId) => requestOrMock(
    () => getMockAvailableBeds(wardId),
    () => apiClient.get('/beds', { params: { wardId, status: 'AVAILABLE' } })
  ),
  getDoctorSpecializations: (departmentId) => {
    if (!USE_MOCKS) {
      return Promise.all([apiClient.get('/departments'), apiClient.get('/doctors')]).then(([departmentResponse, doctorResponse]) => {
        const department = departmentResponse.data.find((item) => item.departmentId === departmentId);
        if (!department) return [];
        return [...new Set(doctorResponse.data
          .filter((doctor) => doctor.departmentId === departmentId || doctor.departmentName === department.departmentName)
          .map((doctor) => doctor.specialization)
          .filter(Boolean))];
      });
    }
    const department = mockStore.departments.find((item) => item.departmentId === departmentId);
    if (!department) return Promise.resolve([]);
    return Promise.resolve([...new Set(mockStore.doctors
      .filter((doctor) => doctor.departmentId === departmentId || doctor.departmentName === department.departmentName)
      .map((doctor) => doctor.specialization)
      .filter(Boolean))]);
  },
  getStaffDesignationTypes: () => Promise.resolve([...STAFF_DESIGNATION_TYPES]),

  // Medicines
  createMedicine: (payload) => requestOrMock(
    () => {
      const created = { medicineId: 'MED-DEMO-' + Date.now(), name: payload.name, medicineName: payload.name, category: payload.category || 'General', price: Number(payload.price), quantity: Number(payload.stockQuantity || 0), stock: Number(payload.stockQuantity || 0), departmentId: payload.departmentId || null };
      mockStore.medicines.push(created);
      return created;
    },
    () => apiClient.post('/medicines', payload).then((res) => mapMedicineFromApi(res.data))
  ),
  getMedicines: (search = '') => requestOrMock(
    () => [...mockStore.medicines].filter((medicine) => (
      `${medicine.name} ${medicine.category}`.toLowerCase().includes(search.trim().toLowerCase())
    )),
    () => apiClient.get('/medicines', { params: search.trim() ? { search: search.trim() } : {} })
      .then((response) => response.data.map(mapMedicineFromApi))
  ),
  dispenseMedicine: (medicineId, quantity) => {
    if (!USE_MOCKS) return unavailable('Medication dispensing');
    requireDemoRole(['ADMIN', 'STAFF']);
    const medicine = mockStore.medicines.find((item) => item.medicineId === medicineId);
    const amount = Number(quantity);
    if (!medicine) throw new Error('Medicine was not found.');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('Enter a whole number of units to dispense.');
    if (amount > medicine.stock) throw new Error('The requested quantity exceeds the available demo stock.');
    medicine.stock -= amount;
    return Promise.resolve(medicine);
  },
  getPrescriptions: () => requestOrMock(
    () => [...mockStore.prescriptions],
    () => apiClient.get('/prescriptions')
  ),
  createPrescription: (payload) => (
    USE_MOCKS
      ? unavailable('Prescription creation in mock mode')
      : apiClient.post('/prescriptions', payload).then((response) => response.data)
  ),
  dispensePrescription: (prescriptionId, prescriptionItemId, quantity) => (
    USE_MOCKS
      ? unavailable('Prescription-linked demo dispensing')
      : apiClient.post(`/prescriptions/${encodeURIComponent(prescriptionId)}/dispensations`, {
        prescriptionItemId,
        quantity: Number(quantity),
      }).then((response) => response.data)
  ),
  getDispensations: () => requestOrMock(
    () => [],
    () => apiClient.get('/dispensations')
  ),

  // Laboratory
  getLaboratoryTests: (filters = {}) => (
    USE_MOCKS
      ? Promise.resolve(mockStore.labTests.filter((test) => (
        api.getCurrentRole() !== 'PATIENT'
        || test.patientPersonId === api.getCurrentUser()?.personId
      )))
      : apiClient.get('/lab-tests', { params: filters }).then(async (response) => {
        const tests = response.data;
        const reports = await Promise.all(tests.map((test) => (
          test.reportId
            ? apiClient.get(`/lab-tests/${encodeURIComponent(test.testId)}/report`)
              .then((reportResponse) => reportResponse.data)
            : Promise.resolve(null)
        )));
        return tests.map((test, index) => mapLabTestFromApi(test, reports[index]));
      })
  ),
  createLaboratoryTest: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/lab-tests', {
        patientId: details.patientId,
        doctorId: details.doctorId,
        testName: details.testType,
      }).then((response) => mapLabTestFromApi(response.data, null));
    }
    requireDemoRole(['ADMIN', 'DOCTOR']);
    const patient = mockStore.patients.find((item) => (
      item.personId === details.patientId || item.patientId === details.patientId
    ));
    if (!patient || !details.testType?.trim()) throw new Error('Select a patient and enter a test name.');
    const currentUser = api.getCurrentUser();
    const doctor = mockStore.doctors.find((item) => (
      item.personId === currentUser?.personId
      || item.doctorId === details.doctorId
      || item.personId === details.doctorId
    ));
    const created = {
      testId: `LAB-DEMO-${Date.now()}`,
      patientPersonId: patient.personId,
      orderedByPersonId: doctor?.personId || currentUser?.personId,
      testType: details.testType.trim(),
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      reportId: null,
      summary: null,
    };
    mockStore.labTests.unshift(created);
    return Promise.resolve(created);
  },
  completeLaboratoryTest: (testId, summary) => {
    if (!USE_MOCKS) return unavailable('Laboratory result publication');
    requireDemoRole(['ADMIN', 'STAFF']);
    if (!summary?.trim()) throw new Error('Enter a demo result summary before completing this test.');
    const test = mockStore.labTests.find((item) => item.testId === testId);
    if (!test) throw new Error('Laboratory test was not found.');
    test.status = 'COMPLETED';
    test.reportId = `REP-DEMO-${Date.now()}`;
    test.summary = summary.trim();
    return Promise.resolve(test);
  },
  publishLaboratoryReport: (testId, resultDetails, result, reviewingDoctorId) => (
    USE_MOCKS
      ? api.completeLaboratoryTest(testId, resultDetails)
      : apiClient.post(`/lab-tests/${encodeURIComponent(testId)}/report`, {
        resultDetails,
        result,
        reviewingDoctorId,
      }).then((response) => ({
        testId: response.data.testId,
        reportId: response.data.reportId,
        summary: response.data.resultDetails,
        result: response.data.result,
      }))
  ),
  cancelLaboratoryTest: (testId) => (
    USE_MOCKS
      ? unavailable('Demo laboratory cancellation')
      : apiClient.patch(`/lab-tests/${encodeURIComponent(testId)}/status`, { status: 'CANCELLED' })
        .then((response) => mapLabTestFromApi(response.data, null))
  ),
  getLaboratoryReport: (testId) => (
    USE_MOCKS
      ? Promise.resolve(mockStore.labTests.find((test) => test.testId === testId) || null)
      : apiClient.get(`/lab-tests/${encodeURIComponent(testId)}/report`).then((response) => response.data)
  ),

  // Surgeries
  getOperatingTheaters: () => (
    USE_MOCKS
      ? (() => {
        requireDemoRole(['ADMIN', 'DOCTOR', 'STAFF']);
        return Promise.resolve(mockStore.theaters.map(({ theaterNumber, department }) => ({
          theaterNumber,
          departmentName: department,
          location: 'Demo facility',
        })));
      })()
      : apiClient.get('/operating-theaters').then((response) => response.data)
  ),
  getSurgeries: (filters = {}) => (
    USE_MOCKS
      ? (() => {
        requireDemoRole(['ADMIN', 'DOCTOR', 'STAFF']);
        return Promise.resolve([...mockStore.theaters]);
      })()
      : apiClient.get('/surgeries', { params: filters })
        .then((response) => response.data.map(mapSurgeryFromApi))
  ),
  scheduleSurgery: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/surgeries', {
        patientId: details.patientId || details.patientPersonId,
        doctorId: details.doctorId,
        theaterNumber: details.theaterNumber,
        scheduledAt: new Date(details.surgeryDate).toISOString(),
        surgeryType: details.surgeryType || details.procedure,
        durationMinutes: Number(details.durationMinutes || 60),
        notes: details.notes || '',
      }).then((response) => mapSurgeryFromApi(response.data));
    }
    requireDemoRole(['ADMIN', 'DOCTOR']);
    if (!details.theaterNumber || !details.patientPersonId || !details.procedure?.trim() || !details.surgeryDate) {
      throw new Error('Complete the theater, patient, procedure, and date fields.');
    }
    if (new Date(details.surgeryDate).getTime() <= Date.now()) throw new Error('Choose a future date and time for the demo procedure.');
    const theater = mockStore.theaters.find((item) => item.theaterNumber === details.theaterNumber);
    const patient = mockStore.patients.find((item) => item.personId === details.patientPersonId);
    if (!theater || !['AVAILABLE', 'ON STANDBY'].includes(theater.status) || !patient) {
      throw new Error('Select an available theater and a patient from the current demo directory.');
    }
    Object.assign(theater, {
      status: 'SCHEDULED',
      currentPatientPersonId: patient.personId,
      procedure: details.procedure.trim(),
      surgeryDate: details.surgeryDate,
    });
    return Promise.resolve(theater);
  },
  updateSurgeryStatus: (surgeryId, status) => (
    USE_MOCKS
      ? unavailable('Demo surgery status updates')
      : apiClient.patch(`/surgeries/${encodeURIComponent(surgeryId)}/status`, { status })
        .then((response) => mapSurgeryFromApi(response.data))
  ),

  // Blood Bank
  getBloodBanks: () => (
    USE_MOCKS
      ? (() => {
        requireDemoRole(['ADMIN', 'STAFF', 'DOCTOR']);
        return Promise.resolve([{ bloodBankId: 'BB-DEMO-001', name: 'MediTek Central Bank', location: 'Demo facility' }]);
      })()
      : apiClient.get('/blood-bank/banks').then((response) => response.data)
  ),
  createBloodBank: (details) => (
    USE_MOCKS
      ? (() => {
        requireDemoRole(['ADMIN']);
        return Promise.resolve({ bloodBankId: `BB-DEMO-${Date.now()}`, ...details });
      })()
      : apiClient.post('/blood-bank/banks', details).then((response) => response.data)
  ),
  getBloodUnits: (filters = {}) => (
    USE_MOCKS
      ? (() => {
        requireDemoRole(['ADMIN', 'STAFF', 'DOCTOR']);
        return Promise.resolve(mockStore.bloodUnits.filter((unit) => (
          (!filters.bloodType || unit.bloodType === filters.bloodType)
          && (!filters.component || unit.component === filters.component)
          && (!filters.search || `${unit.unitId} ${unit.bloodBank}`.toLowerCase().includes(filters.search.toLowerCase()))
        )));
      })()
      : apiClient.get('/blood-bank/units', { params: filters })
        .then((response) => response.data.map(mapBloodUnitFromApi))
  ),
  addBloodUnit: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/blood-bank/units', {
        bloodBankId: details.bloodBankId,
        bloodType: details.bloodType,
        component: details.component,
        collectionDate: details.collectionDate,
        expirationDate: details.expirationDate,
        quantityMl: Number(details.quantityMl),
      }).then((response) => mapBloodUnitFromApi(response.data));
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const quantityMl = Number(details.quantityMl);
    if (!details.bloodType || !details.collectionDate || !details.expirationDate
      || !Number.isInteger(quantityMl) || quantityMl <= 0) {
      throw new Error('Enter a blood type, positive whole-number volume, collection date, and expiry date.');
    }
    if (details.expirationDate <= details.collectionDate) throw new Error('Expiry date must be after the collection date.');
    const unit = {
      unitId: `BLD-DEMO-${Date.now()}`,
      bloodBank: 'MediTek Demo Blood Bank',
      bloodType: details.bloodType,
      component: details.component || 'WHOLE_BLOOD',
      quantityMl,
      collectionDate: details.collectionDate,
      expirationDate: details.expirationDate,
    };
    mockStore.bloodUnits.unshift(unit);
    return Promise.resolve(unit);
  },
  getBloodIssues: () => (
    USE_MOCKS
      ? (() => {
        if (api.getCurrentRole() === 'PATIENT') {
          const patient = mockStore.patients.find((item) => item.personId === api.getCurrentUser()?.personId);
          return Promise.resolve(mockStore.bloodIssues.filter((issue) => issue.patientId === patient?.patientId));
        }
        requireDemoRole(['ADMIN', 'STAFF']);
        return Promise.resolve([...mockStore.bloodIssues]);
      })()
      : apiClient.get('/blood-bank/issues').then((response) => response.data)
  ),
  issueBloodUnit: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/blood-bank/issues', {
        unitId: details.unitId,
        patientId: details.patientId,
        quantityMl: Number(details.quantityMl),
        purpose: details.purpose || '',
      }).then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const unit = mockStore.bloodUnits.find((item) => item.unitId === details.unitId);
    const patient = mockStore.patients.find((item) => (
      item.patientId === details.patientId || item.personId === details.patientId
    ));
    const quantityMl = Number(details.quantityMl);
    const today = new Date().toISOString().slice(0, 10);
    if (!unit || !patient || !Number.isInteger(quantityMl) || quantityMl <= 0) {
      throw new Error('Select a blood unit and patient and enter a positive whole-number volume.');
    }
    if (unit.expirationDate < today || unit.quantityMl < quantityMl) {
      throw new Error('The selected demo unit is expired or has insufficient volume.');
    }
    if (patient.bloodGroup !== unit.bloodType) {
      throw new Error('The selected unit does not match the patient blood group.');
    }
    unit.quantityMl -= quantityMl;
    const issue = {
      bloodIssueId: `ISS-DEMO-${Date.now()}`,
      unitId: unit.unitId,
      bloodType: unit.bloodType,
      component: unit.component || 'WHOLE_BLOOD',
      patientId: patient.patientId,
      patientName: patient.name,
      quantityMl,
      purpose: details.purpose || '',
      issuedAt: new Date().toISOString(),
    };
    mockStore.bloodIssues.unshift(issue);
    return Promise.resolve(issue);
  },

  // Billing
  getBills: (filters = {}) => (
    USE_MOCKS
      ? (() => {
        const role = api.getCurrentRole();
        if (role === 'PATIENT') {
          const user = api.getCurrentUser();
          const patient = mockStore.patients.find((item) => item.personId === user?.personId);
          if (!patient) return Promise.reject(new Error('No demo patient profile is associated with this session.'));
          if (filters.patientId && filters.patientId !== patient.patientId) {
            return Promise.reject(new Error('Patients may view only their own invoices.'));
          }
          return Promise.resolve(mockStore.bills
            .filter((bill) => bill.patientPersonId === patient.personId)
            .map((bill) => normalizeDemoBill(bill, patient)));
        }
        requireDemoRole(['ADMIN', 'STAFF']);
        const query = String(filters.search || '').trim().toLowerCase();
        return Promise.resolve(mockStore.bills
          .map((bill) => normalizeDemoBill(bill))
          .filter((bill) => !filters.patientId || bill.patientId === filters.patientId)
          .filter((bill) => !filters.status || bill.status === filters.status)
          .filter((bill) => !query || `${bill.billId} ${bill.patientName} ${bill.patientId} ${(bill.items || [])
            .map((item) => item.description).join(' ')}`
            .toLowerCase().includes(query)));
      })()
      : apiClient.get('/bills', { params: filters }).then((response) => response.data)
  ),
  createBill: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/bills', details).then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const patient = mockStore.patients.find((item) => (
      item.patientId === details.patientId || item.personId === details.patientPersonId
    ));
    if (!patient || !Array.isArray(details.items) || details.items.length === 0) {
      throw new Error('Select a patient and provide at least one invoice line item.');
    }
    const items = details.items.map((item, index) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.description?.trim() || !Number.isInteger(quantity) || quantity <= 0
          || !Number.isFinite(unitPrice) || unitPrice < 0
          || Math.round(unitPrice * 100) !== unitPrice * 100) {
        throw new Error('Enter a description, positive whole-number quantity, and non-negative unit price.');
      }
      return {
        lineItemId: `BLI-DEMO-${Date.now()}-${index}`,
        description: item.description.trim(),
        quantity,
        unitPrice,
        lineTotal: Number((quantity * unitPrice).toFixed(2)),
      };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const taxRatePercent = Number(details.taxRatePercent || 0);
    if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100
        || Math.round(taxRatePercent * 100) !== taxRatePercent * 100) {
      throw new Error('Tax rate must be between 0 and 100 percent.');
    }
    const taxAmount = Number((subtotal * taxRatePercent / 100).toFixed(2));
    const amountTotal = Number((subtotal + taxAmount).toFixed(2));
    if (amountTotal <= 0) throw new Error('Invoice total must be greater than zero.');
    const bill = {
      billId: `BIL-DEMO-${Date.now()}`,
      patientPersonId: patient.personId,
      patientId: patient.patientId,
      patientName: patient.name,
      items,
      subtotal,
      taxRatePercent,
      taxAmount,
      amountTotal,
      amountPaid: 0,
      balanceDue: amountTotal,
      payments: [],
      status: 'PENDING',
      issuedAt: new Date().toISOString(),
      paidAt: null,
    };
    mockStore.bills.unshift(bill);
    return Promise.resolve(bill);
  },
  addBillLineItem: (billId, details) => {
    if (!USE_MOCKS) {
      return apiClient.post(`/bills/${encodeURIComponent(billId)}/items`, details)
        .then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const bill = mockStore.bills.find((item) => item.billId === billId);
    if (!bill) throw new Error('Invoice was not found.');
    const normalized = normalizeDemoBill(bill);
    return Promise.resolve(recalculateDemoBill(
      bill,
      [...normalized.items, demoBillLineItem(details)]
    ));
  },
  updateBillLineItem: (billId, lineItemId, details) => {
    if (!USE_MOCKS) {
      return apiClient.put(`/bills/${encodeURIComponent(billId)}/items/${encodeURIComponent(lineItemId)}`, details)
        .then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const bill = mockStore.bills.find((item) => item.billId === billId);
    if (!bill) throw new Error('Invoice was not found.');
    const normalized = normalizeDemoBill(bill);
    const exists = normalized.items.some((item) => item.lineItemId === lineItemId);
    if (!exists) throw new Error('Invoice line item was not found.');
    return Promise.resolve(recalculateDemoBill(
      bill,
      normalized.items.map((item) => item.lineItemId === lineItemId
        ? demoBillLineItem(details, lineItemId)
        : item)
    ));
  },
  removeBillLineItem: (billId, lineItemId) => {
    if (!USE_MOCKS) {
      return apiClient.delete(`/bills/${encodeURIComponent(billId)}/items/${encodeURIComponent(lineItemId)}`)
        .then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const bill = mockStore.bills.find((item) => item.billId === billId);
    if (!bill) throw new Error('Invoice was not found.');
    const normalized = normalizeDemoBill(bill);
    const items = normalized.items.filter((item) => item.lineItemId !== lineItemId);
    if (items.length === normalized.items.length) throw new Error('Invoice line item was not found.');
    if (items.length === 0) throw new Error('An invoice must retain at least one line item.');
    return Promise.resolve(recalculateDemoBill(bill, items));
  },
  recordBillPayment: (billId, details) => {
    if (!USE_MOCKS) {
      return apiClient.post(`/bills/${encodeURIComponent(billId)}/payments`, details)
        .then((response) => response.data);
    }
    requireDemoRole(['ADMIN', 'STAFF']);
    const bill = mockStore.bills.find((item) => item.billId === billId);
    if (!bill) throw new Error('Invoice was not found.');
    const normalized = normalizeDemoBill(bill);
    const amount = Number(details.amount);
    if (bill.status === 'PAID' || bill.status === 'CANCELLED'
        || !Number.isFinite(amount) || amount <= 0
        || Math.round(amount * 100) !== amount * 100
        || !['CASH', 'BANK_TRANSFER', 'OTHER'].includes(details.paymentMethod)
        || !details.paymentRequestId) {
      throw new Error('Enter a positive payment amount for an unpaid invoice.');
    }
    if (normalized.payments.some((payment) => payment.paymentRequestId === details.paymentRequestId)) {
      throw new Error('This payment request has already been recorded.');
    }
    if (amount > normalized.balanceDue) throw new Error('Payment amount exceeds the outstanding balance.');
    const payment = {
      paymentId: `PAY-DEMO-${Date.now()}`,
      paymentRequestId: details.paymentRequestId,
      amount,
      paymentMethod: details.paymentMethod,
      recordedBy: api.getCurrentUser()?.name || 'Demo Staff',
      paidAt: new Date().toISOString(),
    };
    bill.payments = [...normalized.payments, payment];
    bill.amountPaid = Number((normalized.amountPaid + amount).toFixed(2));
    bill.amountTotal = normalized.amountTotal;
    bill.balanceDue = Number((normalized.amountTotal - bill.amountPaid).toFixed(2));
    bill.status = bill.balanceDue === 0 ? 'PAID' : 'PARTIAL';
    bill.paidAt = bill.status === 'PAID' ? payment.paidAt : null;
    return Promise.resolve(normalizeDemoBill(bill));
  },
  getMedicalRecords: (filters = {}) => (
    USE_MOCKS
      ? (() => {
        const role = api.getCurrentRole();
        let records = [...mockStore.medicalRecords];
        if (role === 'PATIENT') {
          const patient = mockStore.patients.find((item) => (
            item.personId === api.getCurrentUser()?.personId
          ));
          if (!patient) return Promise.reject(new Error('No demo patient profile is associated with this session.'));
          if (filters.patientId && filters.patientId !== patient.patientId) {
            return Promise.reject(new Error('Patients may view only their own medical records.'));
          }
          records = records.filter((record) => record.patientPersonId === patient.personId);
        } else {
          requireDemoRole(['ADMIN', 'DOCTOR', 'STAFF']);
          if (filters.patientId) {
            const patient = mockStore.patients.find((item) => item.patientId === filters.patientId);
            records = patient
              ? records.filter((record) => record.patientPersonId === patient.personId)
              : [];
          }
          if (role === 'DOCTOR') {
            const personId = api.getCurrentUser()?.personId;
            const assignedPatients = new Set(mockStore.appointments
              .filter((appointment) => appointment.doctorPersonId === personId)
              .map((appointment) => appointment.patientPersonId));
            records = records.filter((record) => (
              record.authorId === personId || assignedPatients.has(record.patientPersonId)
            ));
          }
        }
        const query = String(filters.search || '').trim().toLowerCase();
        if (query) records = records.filter((record) => (
          `${record.title || ''} ${record.summary || ''} ${record.content || ''} ${record.provider || ''}`
            .toLowerCase().includes(query)
        ));
        return Promise.resolve(records);
      })()
      : (api.getCurrentRole() === 'PATIENT'
        ? apiClient.get('/patients/me/medical-records')
        : apiClient.get('/medical-records', { params: filters }))
        .then((response) => response.data)
  ),
  createMedicalRecord: (details) => {
    if (!USE_MOCKS) {
      return apiClient.post('/medical-records', details).then((response) => response.data);
    }
    requireDemoRole(['DOCTOR', 'STAFF']);
    const patient = mockStore.patients.find((item) => item.patientId === details.patientId);
    if (!patient || !details.content?.trim()) {
      throw new Error('Select a registered patient and enter the clinical note.');
    }
    const currentUser = api.getCurrentUser();
    const role = api.getCurrentRole();
    const record = {
      recordId: `REC-DEMO-${Date.now()}`,
      patientPersonId: patient.personId,
      patientId: patient.patientId,
      patientName: patient.name,
      content: details.content.trim(),
      summary: details.content.trim(),
      title: 'Clinical record',
      authorName: currentUser?.name || 'Demo care team',
      provider: currentUser?.name || 'Demo care team',
      authorId: currentUser?.personId || null,
      appointmentId: details.appointmentId || null,
      admissionId: details.admissionId || null,
      recordDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    if (role === 'DOCTOR') {
      const hasAssignedAppointment = mockStore.appointments.some((appointment) => (
        appointment.appointmentId === details.appointmentId
        && appointment.patientPersonId === patient.personId
        && appointment.doctorPersonId === currentUser?.personId
      ));
      if (!hasAssignedAppointment) {
        throw new Error('Doctors may document only their own patient appointments.');
      }
    }
    mockStore.medicalRecords.unshift(record);
    return Promise.resolve(record);
  },

  // Messaging
  getMessages: () => (USE_MOCKS ? Promise.resolve([...mockStore.messages]) : unavailable('Clinical messaging')),
  sendMessage: (text, recipient = 'ALL CLINICAL STAFF') => {
    if (!USE_MOCKS) return unavailable('Clinical messaging');
    requireDemoRole(['ADMIN', 'DOCTOR', 'STAFF']);
    if (!text?.trim()) throw new Error('Enter a message before sending.');
    const user = api.getCurrentUser();
    const message = {
      id: `MSG-DEMO-${Date.now()}`,
      sender: user?.name || user?.username || 'Demo user',
      role: api.getCurrentRole(),
      recipient,
      time: new Date().toLocaleTimeString(),
      text: text.trim(),
      unread: false,
    };
    mockStore.messages.push(message);
    return Promise.resolve(message);
  },
};

export default api;
