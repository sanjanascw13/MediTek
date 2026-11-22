import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  Lock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { api } from '../services/api';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [tokenDetails, setTokenDetails] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setVerificationError('Missing activation token. Please use the link provided in your welcome email.');
      return;
    }

    let isMounted = true;
    api.verifyActivationToken(token)
      .then((details) => {
        if (!isMounted) return;
        if (details.valid) {
          setTokenDetails(details);
        } else {
          setVerificationError(
            details.status === 'ALREADY_USED'
              ? 'This activation link has already been used. Please log in with your credentials.'
              : details.status === 'EXPIRED'
              ? 'This activation link has expired. Please contact your hospital administrator to receive a new activation link.'
              : 'Invalid activation token. Please request a new setup link from your hospital administrator.'
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setVerificationError(api.getErrorMessage(err, 'Unable to verify activation token. Please try again.'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.activateDoctorAccount(token, password);
      setActivated(true);
    } catch (err) {
      setSubmitError(api.getErrorMessage(err, 'Account activation failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1610] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#131b14] border border-[#223125] rounded-3xl p-8 shadow-2xl relative z-10 text-white">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-xl border border-white/20 inline-flex items-center justify-center">
            <img
              src="/meditek-logo-tight.png"
              alt="MediTeck - Hospital Information Management System"
              className="h-11 w-auto object-contain"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-10 space-y-4">
            <RefreshCw className="w-8 h-8 text-lime-400 animate-spin mx-auto" />
            <p className="text-gray-300 text-sm">Verifying your doctor activation link...</p>
          </div>
        )}

        {/* Error / invalid token state */}
        {!loading && verificationError && (
          <div className="text-center py-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Activation Link Issue</h2>
              <p className="text-sm text-gray-300 leading-relaxed bg-[#19241b] border border-[#2c3d2f] p-4 rounded-xl text-left">
                {verificationError}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-sm bg-lime-400 text-black hover:bg-lime-300 transition-colors"
            >
              Go to Login Screen
            </Link>
          </div>
        )}

        {/* Activated success state */}
        {!loading && activated && (
          <div className="text-center py-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-lime-500/20 border border-lime-400/40 flex items-center justify-center mx-auto text-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.3)]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Account Ready!</h2>
              <p className="text-sm text-gray-300 leading-relaxed bg-[#19241b] border border-[#2c3d2f] p-4 rounded-xl">
                Dr. <span className="font-semibold text-white">{tokenDetails?.doctorName}</span>, your MediTek credentials have been securely configured. You can now sign in to your medical dashboard.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-sm bg-lime-400 text-black hover:bg-lime-300 transition-colors gap-2"
            >
              Sign In to MediTek
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Ready to set password */}
        {!loading && !verificationError && !activated && tokenDetails && (
          <div>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-400/30 flex items-center justify-center mx-auto text-lime-400 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Welcome, Dr. {tokenDetails.doctorName}</h2>
              <p className="text-xs text-gray-400 mt-1">
                Please set up your secure password to complete activation.
              </p>
            </div>

            <div className="bg-[#19241b] border border-[#2c3d2f] rounded-xl p-3.5 mb-5 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Assigned Username:</span>
                <span className="font-mono text-lime-400 font-semibold">{tokenDetails.username}</span>
              </div>
              {tokenDetails.email && (
                <div className="flex justify-between text-gray-400">
                  <span>Registered Email:</span>
                  <span className="text-gray-200">{tokenDetails.email}</span>
                </div>
              )}
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#172219] border border-[#2c3d2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-[#172219] border border-[#2c3d2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-lime-400 text-black hover:bg-lime-300 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.2)] mt-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    Set Password & Activate
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

