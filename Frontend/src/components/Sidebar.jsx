import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  CalendarDays,
  UserCheck,
  Users,
  UserCircle,
  MessageSquare,
  Building2,
  Bed,
  Pill,
  Microscope,
  Scissors,
  Droplets,
  Receipt,
  FileText,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { getAllowedPaths } from '../services/roleAccess';

export default function Sidebar() {
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());
  const role = api.getCurrentRole();
  const [allowedPaths, setAllowedPaths] = useState(() => getAllowedPaths(role, currentUser));

  useEffect(() => {
    const handlePermissionsUpdate = () => {
      setAllowedPaths(getAllowedPaths(role, currentUser));
    };
    const handleUserUpdate = () => {
      setCurrentUser(api.getCurrentUser());
    };
    window.addEventListener('meditek_permissions_updated', handlePermissionsUpdate);
    window.addEventListener('meditek_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('meditek_permissions_updated', handlePermissionsUpdate);
      window.removeEventListener('meditek_user_updated', handleUserUpdate);
    };
  }, [role, currentUser]);

  const isSuperAdmin = role === 'SUPER_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || role === 'ADMIN';

  const allNavItems = isSuperAdmin
    ? [{ name: 'Admin Dashboard', path: '/', icon: ShieldAlert }]
    : role === 'LAB_WORKER'
    ? [{ name: 'Lab Command Desk', path: '/', icon: LayoutDashboard }]
    : role === 'PHARMACIST'
    ? [{ name: 'Pharmacy Desk', path: '/', icon: LayoutDashboard }]
    : role === 'RECEPTIONIST'
    ? [
        { name: 'Front Desk Command', path: '/', icon: LayoutDashboard },
        { name: 'Appointments Desk', path: '/appointments', icon: CalendarDays },
      ]
    : role === 'PATIENT'
    ? [{ name: 'My Health Overview', path: '/', icon: LayoutDashboard }]
    : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Appointments', path: '/appointments', icon: CalendarDays },
        { name: 'Doctors', path: '/doctors', icon: UserCheck },
        { name: 'Staff', path: '/staff', icon: Users },
      ];

  const allModuleItems = [
    { name: 'Patients', path: '/patients', icon: UserCircle },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Wards & Beds', path: '/wards', icon: Bed },
    { name: 'Pharmacy', path: '/pharmacy', icon: Pill },
    { name: role === 'LAB_WORKER' ? 'Laboratory Worklist' : 'Lab Reports', path: '/labs', icon: Microscope },
    { name: 'Surgeries', path: '/surgeries', icon: Scissors },
    { name: 'Blood Bank', path: '/blood-bank', icon: Droplets },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Medical Records', path: '/medical-records', icon: FileText },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  const patientItems = [
    { name: 'My Appointments', path: '/patient/appointments', icon: CalendarDays },
    { name: 'My Prescriptions', path: '/patient/prescriptions', icon: Pill },
    { name: 'My Lab Reports', path: '/labs', icon: Microscope },
    { name: 'My Bills & Invoices', path: '/patient/bills', icon: Receipt },
    { name: 'My Health Records', path: '/patient/records', icon: UserCircle },
  ];

  const navItems = allNavItems.filter((item) => allowedPaths.includes(item.path));
  const moduleItems = isSuperAdmin
    ? []
    : role === 'PATIENT'
    ? patientItems
    : allModuleItems.filter((item) => allowedPaths.includes(item.path));

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-[#111912] via-[#142016] to-[#0d140e] text-gray-300 flex flex-col justify-between p-4 rounded-3xl m-3 shadow-2xl border border-[#203023]">
      <div>
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center border border-lime-400/30 shadow-[0_0_15px_rgba(163,230,53,0.25)]">
            <Activity className="w-6 h-6 text-lime-400 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-1">
              MediTek
            </h1>
            <span className="text-[10px] uppercase tracking-wider text-lime-400 font-semibold">
              Hospital System
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="mb-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[#a3e635] text-[#0f1710] shadow-[0_4px_16px_rgba(163,230,53,0.35)] font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Modules Navigation (Only displayed if user has assigned module access) */}
        {moduleItems.length > 0 && (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {role === 'PATIENT' ? 'My Health' : 'Modules'}
            </p>
            <nav className="space-y-1 max-h-[36vh] overflow-y-auto pr-1">
              {moduleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-[#a3e635] text-[#0f1710] font-semibold shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 stroke-[1.8]" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Footer Section */}
      {allowedPaths.includes('/settings') && (
        <div className="pt-4 border-t border-white/10">
          <NavLink
            to="/settings"
            className="flex items-center space-x-3 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
