import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  UserRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  MapPin,
  HeartPulse,
} from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Patient registration state
  const [regForm, setRegForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'MALE',
    phoneNumber: '',
    email: '',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: '',
    username: '',
    password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  const finishLogin = () => {
    navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.login({ username, password });
    } catch (err) {
      setError(api.getErrorMessage(err, 'Unable to sign in. Check your credentials and try again.'));
      return;
    } finally {
      setLoading(false);
    }
    finishLogin();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Client-side validations
    const phonePattern = /^0[0-9]{9}$/;
    if (!phonePattern.test(regForm.phoneNumber)) {
      setError('Phone number must be a 10-digit number starting with 0 (e.g., 0712345678).');
      setLoading(false);
      return;
    }
    if (!phonePattern.test(regForm.emergencyContact)) {
      setError('Emergency contact must be a 10-digit number starting with 0 (e.g., 0771234567).');
      setLoading(false);
      return;
    }
    if (regForm.password.length < 12) {
      setError('Password must be at least 12 characters long.');
      setLoading(false);
      return;
    }

    try {
      await api.registerPatient({
        name: regForm.name.trim(),
        dateOfBirth: regForm.dateOfBirth,
        gender: regForm.gender,
        phoneNumber: regForm.phoneNumber.trim(),
        email: regForm.email.trim(),
        bloodGroup: regForm.bloodGroup,
        address: regForm.address.trim(),
        emergencyContact: regForm.emergencyContact.trim(),
        username: regForm.username.trim(),
        password: regForm.password,
      });
      setSuccessMsg('Registration successful! Redirecting to your patient portal...');
      setTimeout(() => {
        finishLogin();
      }, 1000);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Patient registration failed. Please check your information and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user) => {
    setLoading(true);
    setError('');
    try {
      await api.login({ username: user, password: '' });
      finishLogin();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Demo sign-in failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1610] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full ${mode === 'register' ? 'max-w-2xl' : 'max-w-xl'} bg-[#131b14] border border-[#223125] rounded-3xl p-8 shadow-2xl relative z-10 text-white transition-all`}>
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

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-[#0a110c] p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-lime-400 text-[#0f1710] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Clinical Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-lime-400 text-[#0f1710] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Patient Registration
          </button>
        </div>

        {mode === 'login' ? (
          <>
            <h2 className="text-xl font-bold text-center mb-1">Clinical Portal Sign In</h2>
            <p className="text-xs text-gray-400 text-center mb-6">
              Access electronic medical records and facility operations
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-center mb-1">Patient Self-Registration</h2>
            <p className="text-xs text-gray-400 text-center mb-6">
              Create your patient account to book appointments and view prescriptions
            </p>
          </>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center">
            {successMsg}
          </div>
        )}

        {mode === 'login' ? (
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
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lime-400 transition-colors focus:outline-none p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
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

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className="text-xs text-lime-400 hover:text-lime-300 font-medium transition"
              >
                New patient? Register here for an account &rarr;
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={128}
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={regForm.dateOfBirth}
                    onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Gender *</label>
                <select
                  required
                  value={regForm.gender}
                  onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Blood Group *</label>
                <div className="relative">
                  <HeartPulse className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={regForm.bloodGroup}
                    onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Phone Number (10 digits) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    pattern="^0[0-9]{9}$"
                    placeholder="0712345678"
                    value={regForm.phoneNumber}
                    onChange={(e) => setRegForm({ ...regForm, phoneNumber: e.target.value })}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Emergency Contact (10 digits) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    pattern="^0[0-9]{9}$"
                    placeholder="0771234567"
                    value={regForm.emergencyContact}
                    onChange={(e) => setRegForm({ ...regForm, emergencyContact: e.target.value })}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="e.g. patient@example.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">Address *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    placeholder="e.g. 123 Healthcare Ave, Colombo"
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Desired Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Desired Username *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={64}
                    pattern="^[a-zA-Z0-9._-]+$"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    placeholder="Choose a username"
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Password (min 12 chars) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    maxLength={128}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Choose a strong password"
                    className="w-full pl-11 pr-11 py-2.5 rounded-2xl bg-[#0d140e] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lime-400 transition-colors focus:outline-none p-1"
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4 stroke-[2]" />
                    ) : (
                      <Eye className="w-4 h-4 stroke-[2]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#a3e635] text-[#0f1710] font-bold text-sm hover:bg-[#8ddb16] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(163,230,53,0.35)] mt-6 disabled:opacity-50"
            >
              <span>{loading ? 'Registering Account...' : 'Create Patient Account'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className="text-xs text-lime-400 hover:text-lime-300 font-medium transition"
              >
                Already have an account? Sign In &rarr;
              </button>
            </div>
          </form>
        )}

        {api.isMockMode() && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
              Development Demo Access (Mock Mode)
            </p>
            <p className="mb-3 text-center text-xs text-gray-500">Choose a demo role to continue without credentials.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'admin', label: 'Super Admin', detail: 'Hospital-wide management', icon: ShieldCheck },
                { id: 'doctor', label: 'Doctor', detail: 'Clinical & appointments', icon: Stethoscope },
                { id: 'staff', label: 'Staff', detail: 'Operational worklists', icon: ClipboardList },
                { id: 'patient', label: 'Patient', detail: 'Personal health portal', icon: UserRound },
              ].map(({ id, label, detail, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(id)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-lime-400/50 hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="rounded-xl bg-lime-400/10 p-2 text-lime-300"><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-sm font-bold text-white">{label}</span>
                    <span className="mt-0.5 block text-[10px] text-gray-400">{detail}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-amber-300/80">
              Demo-only navigation; these roles do not represent real security permissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
