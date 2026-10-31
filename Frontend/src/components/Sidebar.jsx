import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const currentUser = api.getCurrentUser();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Appointments', path: '/appointments', icon: CalendarDays },
    { name: 'Doctors', path: '/doctors', icon: UserCheck },
    { name: 'Staff', path: '/staff', icon: Users },
  ];

  const moduleItems = [
    { name: 'Patients', path: '/patients', icon: UserCircle },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Wards & Beds', path: '/wards', icon: Bed },
    { name: 'Pharmacy', path: '/pharmacy', icon: Pill },
    { name: 'Lab Reports', path: '/labs', icon: Microscope },
    { name: 'Surgeries', path: '/surgeries', icon: Scissors },
    { name: 'Blood Bank', path: '/blood-bank', icon: Droplets },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-[#111912] via-[#142016] to-[#0d140e] text-gray-300 flex flex-col justify-between p-4 rounded-3xl m-3 shadow-2xl border border-[#203023]">
      <div>
        {/* Brand / Logo matching the reference image */}
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

        {/* Modules Navigation */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Modules
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
      </div>

      {/* Bottom Footer Section */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <NavLink
          to="/settings"
          className="flex items-center space-x-3 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
        <NavLink
          to="/help"
          className="flex items-center space-x-3 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help Centre</span>
        </NavLink>

        {/* Guy Hawkins / User Pill at bottom matching reference image */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 mt-2">
          <div className="flex items-center space-x-3">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
              alt="Guy Hawkins"
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-lime-400/40"
            />
            <div>
              <p className="text-sm font-semibold text-white leading-none">
                Guy Hawkins
              </p>
              <p className="text-xs text-lime-400 font-medium mt-1">
                Manager
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

