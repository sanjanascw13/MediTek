import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { EmptyState } from '../ApiState';

const appointmentDate = (appointment) => appointment.appointmentDate || appointment.date;
const appointmentId = (appointment) => appointment.appointmentId || appointment.id;

export default function AppointmentsTimeline({ appointments = [] }) {
  const sorted = [...appointments].sort((a, b) => (
    new Date(appointmentDate(a) || 0) - new Date(appointmentDate(b) || 0)
  ));

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Appointments</h3>
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          <CalendarIcon className="w-3.5 h-3.5 text-lime-600" />
          <span>Live schedule</span>
        </div>
      </div>

      {sorted.length === 0 ? <EmptyState>No appointments are available.</EmptyState> : (
        <div className="space-y-3 overflow-y-auto">
          {sorted.slice(0, 5).map((appointment) => {
            const date = appointmentDate(appointment);
            const dateLabel = date
              ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
              : 'Time not provided';
            return (
              <div key={appointmentId(appointment)} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">
                    {appointment.notes || appointment.type || 'Consultation'}
                  </p>
                  <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold text-lime-900">
                    {appointment.status || 'SCHEDULED'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {appointment.patientName || 'Patient'} · {appointment.doctorName || 'Doctor'}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                  <Clock className="h-3 w-3" /> {dateLabel}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
