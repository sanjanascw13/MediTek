import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { api } from './services/api';
import { canAccessPath } from './services/roleAccess';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const DoctorsPage = lazy(() => import('./pages/DoctorsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const WardsBedsPage = lazy(() => import('./pages/WardsBedsPage'));
const PharmacyPage = lazy(() => import('./pages/PharmacyPage'));
const LabsPage = lazy(() => import('./pages/LabsPage'));
const SurgeriesPage = lazy(() => import('./pages/SurgeriesPage'));
const BloodBankPage = lazy(() => import('./pages/BloodBankPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const MedicalRecordsPage = lazy(() => import('./pages/MedicalRecordsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RoleDashboard = lazy(() => import('./pages/RoleDashboard'));
const PatientPortalPage = lazy(() => import('./pages/PatientPortalPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const ChangeDemoPasswordPage = lazy(() => import('./pages/ChangeDemoPasswordPage'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'));

function ProtectedLayout() {
  const location = useLocation();

  if (!api.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (api.getCurrentUser()?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (location.pathname === '/change-password' && !api.getCurrentUser()?.mustChangePassword) {
    return <Navigate to="/" replace />;
  }
  if (!canAccessPath(api.getCurrentRole(), location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<div className="p-8 text-sm font-medium text-gray-500">Loading page...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/activate-account" element={<ActivateAccountPage />} />

            {/* Protected layout routes */}
            <Route path="/" element={<ProtectedLayout />}>
              <Route index element={<RoleDashboard />} />
              <Route path="change-password" element={<ChangeDemoPasswordPage />} />
              <Route path="user-management" element={<UserManagementPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="wards" element={<WardsBedsPage />} />
              <Route path="pharmacy" element={<PharmacyPage />} />
              <Route path="labs" element={<LabsPage />} />
              <Route path="surgeries" element={<SurgeriesPage />} />
              <Route path="blood-bank" element={<BloodBankPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="medical-records" element={<MedicalRecordsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="patient/appointments" element={<PatientPortalPage section="appointments" />} />
              <Route path="patient/prescriptions" element={<PatientPortalPage section="prescriptions" />} />
              <Route path="patient/bills" element={<PatientPortalPage section="bills" />} />
              <Route path="patient/records" element={<PatientPortalPage section="records" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
