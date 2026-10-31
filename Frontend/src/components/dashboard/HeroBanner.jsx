import React from 'react';
import {
  UserPlus,
  Calendar,
  Wallet,
  Activity
} from 'lucide-react';

export default function HeroBanner({ stats }) {
  const cards = [
    {
      title: 'New Patients',
      value: stats?.newPatients || 129,
      icon: UserPlus,
      barColor: 'bg-lime-400',
      bars: [30, 45, 35, 60, 75, 90, 100]
    },
    {
      title: 'Appointments',
      value: stats?.appointments || 650,
      icon: Calendar,
      barColor: 'bg-indigo-400',
      bars: [40, 50, 30, 65, 80, 70, 95]
    },
    {
      title: 'Earning',
      value: stats?.earning ? `$${(stats.earning / 1000).toFixed(0)}k` : '201',
      icon: Wallet,
      barColor: 'bg-cyan-400',
      bars: [25, 35, 50, 60, 75, 85, 100]
    },
    {
      title: 'Operations',
      value: stats?.operations || 54,
      icon: Activity,
      barColor: 'bg-amber-500',
      bars: [20, 35, 30, 50, 65, 80, 90]
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1610] via-[#121e14] to-[#18281b] p-8 text-white shadow-xl border border-white/5 mb-8">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            A modern dashboard for efficient hospital and clinic management.
          </p>
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
                  <div className="flex items-end space-x-1.5 h-10 pb-0.5">
                    {card.bars.map((height, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-t-sm transition-all duration-300 ${card.barColor} opacity-75 group-hover:opacity-100`}
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

