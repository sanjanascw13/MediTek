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
  Pill,
  Microscope,
  Building2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

const DEMO_ROLES = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    name: 'System Administrator',
    username: 'meditekadmin',
    password: 'Admin@Meditek2026!',
    tag: 'Hospital Control & RBAC',
    icon: ShieldCheck,
    color: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    name: 'Dr. Gregory House',
    username: 'meditek_doctor',
    password: 'Admin@Meditek2026!',
    tag: 'Clinical Care & Discharge',
    icon: Stethoscope,
    color: 'from-blue-500/20 to-blue-600/10 text-blue-300 border-blue-500/30',
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    name: 'David Miller',
    username: 'meditek_pharma',
    password: 'Pharma@Meditek2026!',
    tag: 'Formulary & Dispensing',
    icon: Pill,
    color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'lab_tech',
    label: 'Lab Technician',
    name: 'Robert Chen',
    username: 'meditek_labtech',
    password: 'LabTech@Meditek2026!',
    tag: 'Specimens & Pathology',
    icon: Microscope,
    color: 'from-purple-500/20 to-purple-600/10 text-purple-300 border-purple-500/30',
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    name: 'Emma Watson',
    username: 'meditek_reception',
    password: 'Admin@Meditek2026!',
    tag: 'Bed Radar & LKR Cashier',
    icon: Building2,
    color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'patient',
    label: 'Patient',
    name: 'Alice TestPatient',
    username: 'alicetestpatient',
    password: 'Admin@Meditek2026!',
    tag: 'Health Portal & Payments',
    icon: HeartPulse,
    color: 'from-lime-500/20 to-lime-600/10 text-lime-300 border-lime-500/30',
  },
];

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

  const handleQuickRoleLogin = async (demoRole) => {
    setUsername(demoRole.username);
    setPassword(demoRole.password);
    setLoading(true);
    setError('');
    setSuccessMsg(`Signing in as ${demoRole.label} (${demoRole.name})...`);
    try {
      await api.login({ username: demoRole.username, password: demoRole.password });
      finishLogin();
    } catch (err) {
      setError(api.getErrorMessage(err, `Unable to sign in as ${demoRole.label}.`));
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

        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-lime-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Quick Demo Access • 6 Hospital Roles
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-500 hidden sm:inline">
                Click any role to sign in instantly
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DEMO_ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickRoleLogin(r)}
                    className="group relative flex flex-col justify-between p-3 rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all hover:bg-white/[0.08] hover:border-lime-400/50 hover:shadow-lg disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center border shadow-sm`}>
                        <Icon className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 group-hover:text-lime-300 transition-colors">
                        {r.username}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-lime-400 transition-colors">
                          {r.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5">
                        {r.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {r.tag}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-3.5 text-center text-[11px] text-gray-500">
              Live credentials verified from <code className="text-lime-400 font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">access.md</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
