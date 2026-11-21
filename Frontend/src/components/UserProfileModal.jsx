import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  KeyRound,
  BadgeCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function UserProfileModal({ isOpen, onClose, initialTab = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'password'
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
    designation: '',
    profileImage: null,
  });

  // Password Form State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSuccessMessage('');
      setErrorMessage('');
      loadProfile();
    }
  }, [isOpen, initialTab]);

  const loadProfile = async () => {
    setFetching(true);
    setErrorMessage('');
    try {
      const data = await api.getProfile();
      setProfileData({
        username: data.username || '',
        name: data.name || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        role: data.role || '',
        designation: data.designation || '',
        profileImage: data.profileImage || null,
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Fallback to local session user
      const currentUser = api.getCurrentUser() || {};
      setProfileData({
        username: currentUser.username || '',
        name: currentUser.name || currentUser.username || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || '',
        role: currentUser.role || '',
        designation: currentUser.designation || '',
        profileImage: currentUser.profileImage || null,
      });
    } finally {
      setFetching(false);
    }
  };

  // Handle client-side image compression using Canvas
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setProfileData((prev) => ({ ...prev, profileImage: dataUrl }));
        setErrorMessage('');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setProfileData((prev) => ({ ...prev, profileImage: null }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!profileData.name.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!profileData.email.trim()) {
      setErrorMessage('Email Address is required.');
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phoneNumber: profileData.phoneNumber ? profileData.phoneNumber.trim() : null,
        profileImage: profileData.profileImage || null,
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(api.getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!passwords.currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }
    if (!passwords.newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(passwords.currentPassword, passwords.newPassword);
      setSuccessMessage('Password changed successfully!');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(api.getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || profileData.username || 'User')}&background=dcfce7&color=166534&bold=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/60 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f8cc] flex items-center justify-center text-[#284813]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Account Settings</h2>
              <p className="text-xs text-gray-500">Manage your profile details, photo, and security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 pt-2 bg-gray-50/40">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-lime-500 text-lime-700 bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Photo</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'password'
                ? 'border-lime-500 text-lime-700 bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-4">
          {successMessage && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tab 1: Profile & Photo */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            {fetching ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-lime-500 mb-2" />
                <p className="text-xs">Loading profile details...</p>
              </div>
            ) : (
              <>
                {/* Avatar Uploader Section */}
                <div className="flex items-center space-x-5 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                  <div className="relative group">
                    <img
                      src={profileData.profileImage || defaultAvatar}
                      alt={profileData.name || profileData.username}
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-lime-400 shadow-md bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-gray-900 text-white hover:bg-lime-600 shadow-md transition-all active:scale-95"
                      title="Upload photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Profile Photo</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Upload a square PNG, JPG, or WebP. Automatically optimized.
                    </p>
                    <div className="flex items-center space-x-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                      >
                        Choose Photo
                      </button>
                      {profileData.profileImage && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        placeholder="e.g. Dr. Jane Smith"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        placeholder="name@meditek.local"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={profileData.phoneNumber}
                        onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                        placeholder="+94 77 123 4567"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Readonly Username & Role Badges */}
                  <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400">Username: </span>
                      <span className="font-mono font-semibold text-gray-700">@{profileData.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Role: </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-lime-100 text-lime-800 font-bold uppercase tracking-wider text-[10px]">
                        {profileData.role || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-gray-950 font-bold text-xs transition-all shadow-md disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Tip</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Use at least 6 characters with a combination of letters, numbers, and symbols to ensure maximum account security.
                </p>
              </div>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 text-sm text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Guidance */}
            {passwords.newPassword && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <span className={passwords.newPassword.length >= 6 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                    ✓ Minimum 6 characters
                  </span>
                </div>
                {passwords.confirmPassword && (
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <span className={passwords.newPassword === passwords.confirmPassword ? 'text-emerald-600 font-semibold' : 'text-rose-500'}>
                      {passwords.newPassword === passwords.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-gray-950 font-bold text-xs transition-all shadow-md disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

