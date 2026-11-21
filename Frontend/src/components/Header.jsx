import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  Sparkles,
  User,
  KeyRound,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import UserProfileModal from './UserProfileModal';

export default function Header({ onQuickAction }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('profile');

  const dropdownRef = useRef(null);
  const isAdmin = api.getCurrentRole() === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Listen to user updates (e.g. name or avatar change)
  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(api.getCurrentUser());
    };
    window.addEventListener('meditek_user_updated', handleUserUpdate);
    return () => window.removeEventListener('meditek_user_updated', handleUserUpdate);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleOpenProfileModal = (tab = 'profile') => {
    setModalTab(tab);
    setModalOpen(true);
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    api.logout();
    navigate('/login');
  };

  const userAvatar = user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || 'User')}&background=dcfce7&color=166534&bold=true`;

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        {/* Search Input Bar matching reference */}
        <div className="flex items-center space-x-3 w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search...."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200/80 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 transition-all shadow-sm"
            />
          </div>

          {/* + Space Button from reference */}
          {isAdmin && (
            <button
              onClick={onQuickAction}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-[#e6f8cc] hover:bg-[#dcf5ba] text-[#284813] font-semibold text-xs transition-all shadow-sm active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-600" />
              <span>+ Space</span>
            </button>
          )}
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle Pill (Moon / Sun) */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all ${
                !isDark
                  ? 'bg-transparent text-gray-500 hover:text-gray-900'
                  : 'bg-gray-800 text-yellow-400 shadow-sm'
              }`}
              title="Dark mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all ${
                !isDark
                  ? 'bg-[#d9f99d] text-[#1a2e05] shadow-sm'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
              title="Light mode"
            >
              <Sun className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Notification Bell */}
          <button className="relative p-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all shadow-sm">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-lime-500 ring-2 ring-white"></span>
          </button>

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 pl-2 py-1 pr-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50/80 transition-all focus:outline-none"
            >
              <img
                src={userAvatar}
                alt={user?.name || user?.username || 'Current user'}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-lime-400 bg-white"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight">
                  {user?.name || user?.username || 'Clinical User'}
                </p>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {user?.username ? `@${user.username}` : ''}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 stroke-[2] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in divide-y divide-gray-100">
                {/* User Summary Header */}
                <div className="px-4 py-3 flex items-center space-x-3">
                  <img
                    src={userAvatar}
                    alt={user?.name || user?.username}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-lime-400 shadow-sm bg-white"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email || (user?.username ? `@${user.username}` : '')}
                    </p>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-lime-100 text-lime-800 font-bold uppercase text-[9px] tracking-wider">
                        {user?.role || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleOpenProfileModal('profile')}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Update Profile & Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenProfileModal('password')}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    <span>Change Password</span>
                  </button>
                </div>

                {/* Log Out Action */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      <UserProfileModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
      />
    </>
  );
}
