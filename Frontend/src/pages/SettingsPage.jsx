import React from 'react';
import { Settings, Shield, Bell, Key, Database, RefreshCw, Server, UserCheck } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Configuration & Security Roles</h2>
        <p className="text-sm text-gray-500">MediTek enterprise parameters, database connections, and role-based permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-lime-100 text-lime-800">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Access Roles & Security (RBAC)</h3>
              <p className="text-xs text-gray-400">Application role-to-Person mapping enforcement</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="font-bold text-gray-800">ADMIN</span>
              <span className="text-gray-500">Full system access, audit logs & configuration</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="font-bold text-gray-800">DOCTOR</span>
              <span className="text-gray-500">Prescriptions, surgeries, lab orders & discharge</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="font-bold text-gray-800">STAFF</span>
              <span className="text-gray-500">Admissions, bed allocations & nursing notes</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="font-bold text-gray-800">PATIENT</span>
              <span className="text-gray-500">Personal health records & appointment bookings</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-800">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Backend API & Database Connection</h3>
              <p className="text-xs text-gray-400">Spring Boot 3 + MySQL 8.0 connection parameters</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl font-mono">
            <div>
              <span className="text-gray-400 block text-[10px]">API Endpoint:</span>
              <span className="font-bold">http://localhost:8080/api</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Database Engine:</span>
              <span className="font-bold">MySQL 8.0 (InnoDB) with UTC time zone</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Authentication Scheme:</span>
              <span className="font-bold">JWT (HMAC-SHA256) + Spring Security 6</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Active Flyway Schema:</span>
              <span className="font-bold text-lime-800">V1__init.sql (20 domain entities)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

