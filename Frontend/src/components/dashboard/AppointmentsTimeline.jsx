import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AppointmentsTimeline({ appointments }) {
  const days = [
    { name: 'Mon', date: '23' },
    { name: 'Tue', date: '24' },
    { name: 'Wed', date: '25' },
    { name: 'Thu', date: '26' },
    { name: 'Fri', date: '27' },
    { name: 'Sat', date: '28' },
  ];

  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM'];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Appointments
        </h3>
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          <CalendarIcon className="w-3.5 h-3.5 text-lime-600" />
          <span className="text-gray-700">June 2026</span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="relative pt-2">
        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs pb-3 border-b border-gray-100">
          <span className="text-gray-400 font-medium"></span>
          {days.map((d, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-semibold">{d.name}</span>
              <span className="text-sm font-bold text-gray-800">{d.date}</span>
            </div>
          ))}
        </div>

        {/* Time Rows */}
        <div className="divide-y divide-dashed divide-gray-100">
          {/* 09:00 AM */}
          <div className="relative grid grid-cols-7 gap-2 py-3.5 items-center">
            <span className="text-[11px] font-semibold text-gray-400">09:00 AM</span>
            <div className="col-span-6 h-6"></div>
          </div>

          {/* 10:00 AM with Green Event Pill */}
          <div className="relative grid grid-cols-7 gap-2 py-3.5 items-center">
            <span className="text-[11px] font-semibold text-gray-400">10:00 AM</span>
            <div className="col-span-6 relative h-7">
              {/* Event pill matching reference */}
              <div className="absolute left-[18%] w-[55%] h-8 -top-0.5 rounded-full bg-[#3b7e28] text-white flex items-center px-2 space-x-2 shadow-md border border-[#4d9e35]">
                <div className="flex -space-x-2">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                    alt="doctor"
                    className="w-5 h-5 rounded-full border border-white"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                    alt="patient"
                    className="w-5 h-5 rounded-full border border-white"
                  />
                </div>
                <span className="text-xs font-semibold truncate tracking-tight">
                  Vendor Risk As...
                </span>
              </div>
            </div>
          </div>

          {/* 11:00 AM with Lime Event Pill */}
          <div className="relative grid grid-cols-7 gap-2 py-3.5 items-center">
            <span className="text-[11px] font-semibold text-gray-400">11:00 AM</span>
            <div className="col-span-6 relative h-7">
              {/* Event pill matching reference */}
              <div className="absolute left-[40%] w-[52%] h-8 -top-0.5 rounded-full bg-[#dcfce7] text-[#14532d] flex items-center px-2 space-x-2 shadow-sm border border-lime-300">
                <div className="flex -space-x-2">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
                    alt="doctor"
                    className="w-5 h-5 rounded-full border border-white"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
                    alt="patient"
                    className="w-5 h-5 rounded-full border border-white"
                  />
                </div>
                <span className="text-xs font-semibold truncate tracking-tight text-gray-900">
                  Discuss Q3 Goals
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

