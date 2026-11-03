import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { EmptyState } from '../ApiState';

export default function PatientChart({ data }) {
  const chartData = Array.isArray(data) ? data : [];
  const total = chartData.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-4">
        Patient Chart
      </h3>

      {chartData.length === 0 ? <EmptyState>No patient chart data is available yet.</EmptyState> : (
      <div className="flex items-center justify-between">
        {/* Donut Chart with center label */}
        <div className="relative w-44 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text matching reference */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-gray-900 leading-none">
              {total}
            </span>
            <span className="text-[11px] font-medium text-gray-400 mt-1">
              Total People
            </span>
          </div>
        </div>

        {/* Legend matching reference image layout */}
        <div className="space-y-3.5 pr-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs font-semibold text-gray-500">
                  {item.name}
                </span>
              </div>
              <span className="text-base font-bold text-gray-800 ml-4">
                {item.percentage != null ? `${item.percentage}% (${item.value})` : `${item.value}`}
              </span>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
