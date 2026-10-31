import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import DoctorsPage from './pages/DoctorsPage';
import StaffPage from './pages/StaffPage';
import PatientsPage from './pages/PatientsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import WardsBedsPage from './pages/WardsBedsPage';
import PharmacyPage from './pages/PharmacyPage';
import LabsPage from './pages/LabsPage';
import SurgeriesPage from './pages/SurgeriesPage';
import BloodBankPage from './pages/BloodBankPage';
import BillingPage from './pages/BillingPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected layout routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
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
          <Route path="messages" element={<MessagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
