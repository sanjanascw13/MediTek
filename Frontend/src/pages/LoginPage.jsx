import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login({ username, password });
      navigate('/');
    } catch (err) {
      setError('Invalid clinical credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (roleName, user, pass) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    await api.login({ username: user, password: pass });
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0d1610] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#131b14] border border-[#223125] rounded-3xl p-8 shadow-2xl relative z-10 text-white">
        {/* Brand */}
        <div className="flex items-center space-x-3 mb-6 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-lime-500/20 flex items-center justify-center border border-lime-400/30 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
            <Activity className="w-7 h-7 text-lime-400 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">MediTek</h1>
            <p className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">
              Hospital Management
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-1">Clinical Portal Sign In</h2>
        <p className="text-xs text-gray-400 text-center mb-6">
          Access electronic medical records and facility operations
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Username / Clinical ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or dr.chen"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#a3e635] text-[#0f1710] font-bold text-sm hover:bg-[#8ddb16] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(163,230,53,0.35)] mt-6 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Demo Sign In Roles */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
            Quick One-Click Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => quickLogin('Admin', 'admin', 'adminPass')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium text-center"
            >
              👑 Manager (Admin)
            </button>
            <button
              onClick={() => quickLogin('Doctor', 'doctor', 'doctorPass')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium text-center"
            >
              🩺 Doctor (Physician)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

