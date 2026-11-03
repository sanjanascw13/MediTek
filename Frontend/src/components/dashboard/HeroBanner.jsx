import React from 'react';
import {
  UserPlus,
  Calendar,
  Wallet,
  Activity,
  Bed,
  Droplet,
  Users
} from 'lucide-react';

export default function HeroBanner({ stats, showDemoTrends = true }) {
  const role = stats?.role;

  let cards = [];
  if (role === 'PATIENT') {
    cards = [
      {
        title: 'My Appointments',
        value: stats?.appointments ?? 0,
        icon: Calendar,
        barColor: 'bg-indigo-400',
        bars: [40, 50, 30, 65, 80, 70, 95]
      },
      {
        title: 'Outstanding Balance',
        value: stats?.outstandingBalance != null ? `$${stats.outstandingBalance.toFixed(2)}` : '$0.00',
        icon: Wallet,
        barColor: 'bg-amber-400',
        bars: [25, 35, 50, 60, 75, 85, 100]
      },
      {
        title: 'Total Paid',
        value: stats?.totalPaid != null ? `$${stats.totalPaid.toFixed(2)}` : '$0.00',
        icon: Wallet,
        barColor: 'bg-cyan-400',
        bars: [30, 45, 35, 60, 75, 90, 100]
      },
      {
        title: 'Medical Records',
        value: stats?.medicalRecordsCount ?? 0,
        icon: Activity,
        barColor: 'bg-lime-400',
        bars: [20, 35, 30, 50, 65, 80, 90]
      }
    ];
  } else if (role === 'DOCTOR') {
    cards = [
      {
        title: 'My Patients',
        value: stats?.newPatients ?? 0,
        icon: UserPlus,
        barColor: 'bg-lime-400',
        bars: [30, 45, 35, 60, 75, 90, 100]
      },
      {
        title: 'Assigned Appointments',
        value: stats?.appointments ?? 0,
        icon: Calendar,
        barColor: 'bg-indigo-400',
        bars: [40, 50, 30, 65, 80, 70, 95]
      },
      {
        title: 'Active Inpatients',
        value: stats?.activeAdmissions ?? 0,
        icon: Activity,
        barColor: 'bg-cyan-400',
        bars: [25, 35, 50, 60, 75, 85, 100]
      },
      {
        title: 'Pending Lab Tests',
        value: stats?.pendingLabTests ?? 0,
        icon: Activity,
        barColor: 'bg-amber-500',
        bars: [20, 35, 30, 50, 65, 80, 90]
      }
    ];
  } else if (role === 'STAFF') {
    cards = [
      {
        title: 'Registered Patients',
        value: stats?.newPatients ?? 0,
        icon: UserPlus,
        barColor: 'bg-lime-400',
        bars: [30, 45, 35, 60, 75, 90, 100]
      },
      {
        title: 'Appointments',
        value: stats?.appointments ?? 0,
        icon: Calendar,
        barColor: 'bg-indigo-400',
        bars: [40, 50, 30, 65, 80, 70, 95]
      },
      {
        title: 'Active Admissions',
        value: stats?.activeAdmissions ?? 0,
        icon: Activity,
        barColor: 'bg-cyan-400',
        bars: [25, 35, 50, 60, 75, 85, 100]
      },
      {
        title: 'Blood Stock (Units)',
        value: stats?.bloodUnitsInStock ?? 0,
        icon: Activity,
        barColor: 'bg-rose-500',
        bars: [20, 35, 30, 50, 65, 80, 90]
      }
    ];
  } else {
    // SUPER_ADMIN / ADMIN
    const formatEarning = (amt) => {
      if (amt == null) return '$0.00';
      if (amt >= 1000) return `$${(amt / 1000).toFixed(1)}k`;
      return `$${amt.toFixed(2)}`;
    };

    cards = [
      {
        title: 'Total Patients',
        value: stats?.newPatients ?? 0,
        icon: UserPlus,
        barColor: 'bg-lime-400',
        bars: [30, 45, 35, 60, 75, 90, 100]
      },
      {
        title: 'Appointments',
        value: stats?.appointments ?? 0,
        icon: Calendar,
        barColor: 'bg-indigo-400',
        bars: [40, 50, 30, 65, 80, 70, 95]
      },
      {
        title: 'Hospital Revenue',
        value: formatEarning(stats?.earning),
        icon: Wallet,
        barColor: 'bg-cyan-400',
        bars: [25, 35, 50, 60, 75, 85, 100]
      },
      {
        title: 'Operations',
        value: stats?.operations != null && stats.operations > 0 ? stats.operations : 'N/A',
        icon: Activity,
        barColor: 'bg-amber-500',
        bars: [20, 35, 30, 50, 65, 80, 90]
      }
    ];
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1610] via-[#121e14] to-[#18281b] p-8 text-white shadow-xl border border-white/5 mb-8">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              MediTek Dashboard
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              A modern dashboard for efficient hospital and clinic management.
            </p>
          </div>
          {role && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-lime-400 border border-lime-400/20">
              Role: {role.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* 4 Cards Grid from reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="relative bg-white/[0.06] hover:bg-white/[0.09] backdrop-blur-md rounded-2xl p-4 border border-white/10 transition-all duration-300 shadow-lg group"
              >
                <div className="flex items-center space-x-2 text-gray-300 text-xs font-medium mb-3">
                  <div className="p-1.5 rounded-lg bg-white/10 text-gray-200">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{card.title}</span>
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {card.value}
                  </span>

                  {/* Mini bar chart */}
                  {showDemoTrends && (
                    <div className="flex items-end space-x-1.5 h-10 pb-0.5">
                      {card.bars.map((height, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-t-sm transition-all duration-300 ${card.barColor} opacity-75 group-hover:opacity-100`}
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Operational Highlights for Super Admin / Staff */}
        {(role === 'SUPER_ADMIN' || role === 'STAFF') && stats?.totalBeds != null && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-emerald-400" />
              <span>Beds Available: <strong className="text-white">{stats.availableBeds ?? 0} / {stats.totalBeds ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-rose-400" />
              <span>Blood Stock: <strong className="text-white">{stats.bloodUnitsInStock ?? 0} units</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Pending Labs: <strong className="text-white">{stats.pendingLabTests ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Active Inpatients: <strong className="text-white">{stats.activeAdmissions ?? 0}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
