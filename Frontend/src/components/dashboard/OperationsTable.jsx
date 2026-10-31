import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OperationsTable({ operations }) {
  const list = operations || [
    {
      id: 'OP-001',
      patientName: 'John Deo',
      patientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '12-08-2026',
      duration: '3 hours',
      followUpDate: '12-09-2026',
    },
    {
      id: 'OP-002',
      patientName: 'Jens Brincker',
      patientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '14-08-2026',
      duration: '2 hours',
      followUpDate: '14-09-2026',
    },
    {
      id: 'OP-003',
      patientName: 'Elena Rostova',
      patientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '18-08-2026',
      duration: '4 hours',
      followUpDate: '18-09-2026',
    },
    {
      id: 'OP-004',
      patientName: 'Marcus Vance',
      patientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      dateOfOperation: '20-08-2026',
      duration: '1.5 hours',
      followUpDate: '20-09-2026',
    }
  ];

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

      {/* Table matching reference */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">Patient Name</th>
              <th className="pb-3">Date Of Operation</th>
              <th className="pb-3">Duration</th>
              <th className="pb-3">Follow-Up Date</th>
              <th className="pb-3 pr-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {list.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50/70 transition-colors group"
              >
                {/* Patient Avatar + Name */}
                <td className="py-3.5 pl-2">
                  <div className="flex items-center space-x-3">
                    <img
                      src={row.patientAvatar}
                      alt={row.patientName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                    />
                    <span className="font-bold text-gray-900 text-sm">
                      {row.patientName}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.dateOfOperation}
                </td>

                {/* Duration */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.duration}
                </td>

                {/* Follow-up */}
                <td className="py-3.5 text-gray-600 font-medium">
                  {row.followUpDate}
                </td>

                {/* Actions: Edit & Delete matching styling in reference */}
                <td className="py-3.5 pr-2 text-right">
                  <div className="inline-flex items-center space-x-2">
                    <button
                      title="Edit Operation"
                      className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-colors border border-sky-100"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete Operation"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors border border-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

