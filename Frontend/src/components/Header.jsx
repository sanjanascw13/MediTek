import React, { useState } from 'react';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function Header({ onQuickAction }) {
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const user = api.getCurrentUser();
  const isAdmin = api.getCurrentRole() === 'ADMIN';

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
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

        {/* User Profile Pill matching reference */}
        <div className="flex items-center space-x-3 pl-2 py-1 pr-3 rounded-2xl bg-white border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50/80 transition-all">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
            alt={user?.name || user?.username || 'Current user'}
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-lime-400"
          />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-800 leading-tight">
              {user?.name || user?.username || 'Clinical User'}
            </p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {user?.username ? `@${user.username}` : ''}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 stroke-[2]" />
        </div>
      </div>
    </header>
  );
}
