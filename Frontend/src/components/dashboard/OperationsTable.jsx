import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../ApiState';

export default function OperationsTable({ operations }) {
  const list = operations || [];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      {/* Title Header matching reference */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Operations
        </h3>
        <Link
          to="/surgeries"
          className="text-xs font-bold text-lime-600 hover:text-lime-700 hover:underline transition-all"
        >
          View All
        </Link>
      </div>

      {list.length === 0 ? <EmptyState>Surgery scheduling data is not available from the current API.</EmptyState> : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">Patient Name</th>
              <th className="pb-3">Date Of Operation</th>
              <th className="pb-3">Procedure</th>
              <th className="pb-3">Lead Surgeon</th>
              <th className="pb-3 pr-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {list.map((row) => (
              <tr
                key={row.surgeryId || row.id}
                className="hover:bg-gray-50/70 transition-colors group"
              >
                {/* Patient Avatar + Name */}
                <td className="py-3.5 pl-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-10 h-10 rounded-full bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
                      {(row.patientName || 'P').slice(0, 1)}
                    </span>
                    <span className="font-bold text-gray-900 text-sm">
                      {row.patientName}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.surgeryDate || row.dateOfOperation || '—'}
                </td>

                {/* Duration */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.surgeryType || row.procedure || '—'}
                </td>

                {/* Follow-up */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.leadSurgeonName || row.surgeon || '—'}
                </td>
                <td className="py-3.5 pr-2">{row.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
