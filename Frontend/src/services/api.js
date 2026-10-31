import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
      patientName: 'Arthur Dent',
      doctorName: 'Dr. Robert Chen',
      date: '2026-06-23',
      time: '09:00 AM',
      type: 'Vendor Risk As...',
      status: 'SCHEDULED',
      color: '#84cc16'
    },
    {
      id: 'APT-002',
      patientName: 'Ford Prefect',
      doctorName: 'Dr. Sarah Connor',
      date: '2026-06-24',
      time: '11:00 AM',
      type: 'Discuss Q3 Goals',
      status: 'SCHEDULED',
      color: '#a855f7'
    },
    {
      id: 'APT-003',
      patientName: 'Trillian McMillan',
      doctorName: 'Dr. Bruce Wayne',
      date: '2026-06-25',
      time: '10:00 AM',
      type: 'Cardio Follow-up',
      status: 'SCHEDULED',
      color: '#0ea5e9'
    }
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
    { departmentId: 'DEP-000008', departmentName: 'Maternity & Neonatal Unit', location: '4th Floor Block A', subtype: 'MATERNITY', detail: 'Maternal Care' }
  ],
  wards: [
    { wardId: 'WRD-001', wardName: 'St. Jude General Ward', wardType: 'GENERAL', totalBeds: 20, occupiedBeds: 16 },
    { wardId: 'WRD-002', wardName: 'Cardiovascular Step-Down', wardType: 'CARDIAC', totalBeds: 12, occupiedBeds: 9 },
    { wardId: 'WRD-003', wardName: 'Pediatric Care Ward', wardType: 'PEDIATRIC', totalBeds: 15, occupiedBeds: 11 },
    { wardId: 'WRD-004', wardName: 'Surgical Recovery Unit', wardType: 'SURGICAL', totalBeds: 18, occupiedBeds: 15 }
  ],
  medicines: [
    { medicineId: 'MED-001', name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 14.50, stock: 450 },
    { medicineId: 'MED-002', name: 'Paracetamol 650mg', category: 'Analgesic', price: 4.00, stock: 1200 },
    { medicineId: 'MED-003', name: 'Atorvastatin 20mg', category: 'Cardiovascular', price: 28.00, stock: 380 },
    { medicineId: 'MED-004', name: 'Metformin 500mg', category: 'Antidiabetic', price: 12.00, stock: 600 },
    { medicineId: 'MED-005', name: 'Pantoprazole 40mg', category: 'Antacid', price: 18.50, stock: 520 }
  ],
  bloodUnits: [
    { unitId: 'BLD-001', bloodBank: 'MediTek Central Bank', bloodType: 'O+', collectionDate: '2026-10-15', expirationDate: '2026-11-26', quantityMl: 450 },
    { unitId: 'BLD-002', bloodBank: 'MediTek Central Bank', bloodType: 'A+', collectionDate: '2026-10-18', expirationDate: '2026-11-29', quantityMl: 450 },
    { unitId: 'BLD-003', bloodBank: 'MediTek Central Bank', bloodType: 'B+', collectionDate: '2026-10-20', expirationDate: '2026-12-01', quantityMl: 450 },
    { unitId: 'BLD-004', bloodBank: 'MediTek Central Bank', bloodType: 'AB-', collectionDate: '2026-10-12', expirationDate: '2026-11-23', quantityMl: 450 }
  ],
  bills: [
    { billId: 'BIL-001', patientName: 'John Deo', amountTotal: 1250.00, status: 'PAID', issuedAt: '2026-10-25', paidAt: '2026-10-26' },
    { billId: 'BIL-002', patientName: 'Jens Brincker', amountTotal: 840.50, status: 'PENDING', issuedAt: '2026-10-28', paidAt: null },
    { billId: 'BIL-003', patientName: 'Elena Rostova', amountTotal: 3420.00, status: 'PENDING', issuedAt: '2026-10-30', paidAt: null }
  ]
};

// Resilient API wrappers: will call Spring Boot API if reachable, else use local reactive mock store
export const api = {
  // Authentication
  login: async (credentials) => {
    try {
      const res = await apiClient.post('/auth/login', credentials);
      localStorage.setItem('meditek_token', res.data.token);
      localStorage.setItem('meditek_user', JSON.stringify(res.data.user));
      return res.data;
    } catch {
      // Offline/dev fallback
      const mockUser = {
        username: credentials.username || 'admin',
        name: credentials.username === 'doctor' ? 'Dr. Sarah Smith' : 'Guy Hawkins',
        role: credentials.username === 'doctor' ? 'DOCTOR' : 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
      };
      const token = 'mock_jwt_token_meditek_secret_session_2026';
      localStorage.setItem('meditek_token', token);
      localStorage.setItem('meditek_user', JSON.stringify(mockUser));
      return { token, user: mockUser };
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('meditek_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return {
      name: 'Sarah Smith',
      username: '@nathan_oallins',
      managerName: 'Guy Hawkins',
      managerRole: 'Manager',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      managerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
    };
  },

  logout: () => {
    localStorage.removeItem('meditek_token');
    localStorage.removeItem('meditek_user');
  },

  // Dashboard endpoints
  getDashboardStats: async () => {
    try {
      const res = await apiClient.get('/dashboard/stats');
      return res.data;
    } catch {
      return mockStore.stats;
    }
  },

  getPatientChartData: async () => {
    try {
      const res = await apiClient.get('/dashboard/patient-chart');
      return res.data;
    } catch {
      return mockStore.patientDistributions;
    }
  },

  getOperations: async () => {
    try {
      const res = await apiClient.get('/surgeries');
      return res.data;
    } catch {
      return mockStore.operations;
    }
  },

  getAppointments: async () => {
    try {
      const res = await apiClient.get('/appointments');
      return res.data;
    } catch {
      return mockStore.appointments;
    }
  },

  // Patients
  getPatients: async () => {
    try {
      const res = await apiClient.get('/patients');
      return res.data;
    } catch {
      return mockStore.patients;
    }
  },

  createPatient: async (patientData) => {
    try {
      const res = await apiClient.post('/patients', patientData);
      return res.data;
    } catch {
      const newPatient = {
        personId: `PER-00000${mockStore.patients.length + 1}`,
        patientId: `PAT-00000${mockStore.patients.length + 1}`,
        ...patientData,
        isActive: true
      };
      mockStore.patients.push(newPatient);
      return newPatient;
    }
  },

  // Doctors
  getDoctors: async () => {
    try {
      const res = await apiClient.get('/doctors');
      return res.data;
    } catch {
      return mockStore.doctors;
    }
  },

  // Departments
  getDepartments: async () => {
    try {
      const res = await apiClient.get('/departments');
      return res.data;
    } catch {
      return mockStore.departments;
    }
  },

  // Wards & Beds
  getWards: async () => {
    try {
      const res = await apiClient.get('/wards');
      return res.data;
    } catch {
      return mockStore.wards;
    }
  },

  // Medicines
  getMedicines: async () => {
    try {
      const res = await apiClient.get('/medicines');
      return res.data;
    } catch {
      return mockStore.medicines;
    }
  },

  // Blood Bank
  getBloodUnits: async () => {
    try {
      const res = await apiClient.get('/blood-units');
      return res.data;
    } catch {
      return mockStore.bloodUnits;
    }
  },

  // Billing
  getBills: async () => {
    try {
      const res = await apiClient.get('/bills');
      return res.data;
    } catch {
      return mockStore.bills;
    }
  }
};

export default api;

