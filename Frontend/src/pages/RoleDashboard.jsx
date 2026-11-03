import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, Stethoscope, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import DashboardPage from './DashboardPage';
import PatientPortalPage from './PatientPortalPage';
import { EmptyState, ErrorState, LoadingState, UnavailableNotice } from '../components/ApiState';

function DashboardCard({ label, value, icon: Icon, to }) {
  return (
    <Link to={to} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-lime-50 p-3 text-lime-800"><Icon className="h-6 w-6" /></div>
      </div>
    </Link>
  );
}

function ClinicalDashboard() {
  const user = api.getCurrentUser();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const upcomingAppointments = appointments.filter((appointment) => {
    const date = appointment.appointmentDate || appointment.date;
    return appointment.status === 'SCHEDULED' && (!date || new Date(date) >= new Date());
  });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allAppointments, patientList] = await Promise.all([
        api.getAppointments(),
        api.getPatients(),
      ]);
      const assigned = allAppointments.filter((item) => (
        item.doctorPersonId === user?.personId || item.doctorName === user?.name
      ));
      setAppointments(assigned);
      const assignedPatientIds = new Set(assigned.map((appointment) => appointment.patientPersonId));
      setPatients(patientList.filter((patient) => assignedPatientIds.has(patient.personId)));
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load clinical dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.personId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Clinical workspace</p>
        <h1 className="mt-1 text-3xl font-black text-gray-900">Welcome, {user?.name || 'Doctor'}</h1>
        <p className="mt-1 text-sm text-gray-500">Your appointment schedule and clinical worklist.</p>
      </div>
      {error && <ErrorState message={error} onRetry={loadWorkspace} />}
      {loading ? <LoadingState label="Loading your clinical workspace..." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardCard label="Upcoming appointments" value={upcomingAppointments.length} icon={CalendarDays} to="/appointments" />
          <DashboardCard label="Patient directory" value={patients.length} icon={Users} to="/patients" />
        </div>
      )}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-lime-700" />
          <h2 className="text-lg font-bold text-gray-900">Your next appointments</h2>
        </div>
        {loading ? null : upcomingAppointments.length === 0 ? <EmptyState>No upcoming appointments are assigned to this demo doctor. View appointment history for completed visits.</EmptyState> : (
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 5).map((appointment) => (
              <div key={appointment.appointmentId || appointment.id} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-gray-50 p-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{appointment.patientName || 'Patient'}</p>
                  <p className="text-gray-500">{appointment.notes || appointment.type || 'Consultation'}</p>
                </div>
                <span className="text-gray-600">{appointment.appointmentDate || appointment.date || 'Date not provided'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {api.isMockMode() && <DemoNotice />}
    </section>
  );
}

function StaffDashboard() {
  const user = api.getCurrentUser();
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appointmentList, admissionList] = await Promise.all([
        api.getAppointments(),
        api.getActiveAdmissions(),
      ]);
      setAppointments(appointmentList.filter((item) => item.status === 'SCHEDULED'));
      setAdmissions(admissionList);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load operations dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-800">Operations workspace</p>
        <h1 className="mt-1 text-3xl font-black text-gray-900">Welcome, {user?.name || 'Staff member'}</h1>
        <p className="mt-1 text-sm text-gray-500">Operational worklist for appointments and active admissions.</p>
      </div>
      {error && <ErrorState message={error} onRetry={loadWorkspace} />}
      {loading ? <LoadingState label="Loading operational worklist..." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardCard label="Scheduled appointments" value={appointments.length} icon={CalendarDays} to="/appointments" />
          <DashboardCard label="Active admissions" value={admissions.length} icon={ClipboardList} to="/wards" />
        </div>
      )}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Operational shortcuts</h2>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/wards">Inpatient admissions</Link>
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/pharmacy">Pharmacy inventory</Link>
          <Link className="rounded-xl bg-lime-100 px-4 py-2 text-sm font-semibold text-lime-900" to="/labs">Laboratory worklist</Link>
        </div>
      </div>
      {api.isMockMode() && <DemoNotice />}
    </section>
  );
}

function DemoNotice() {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      Development demo data only. Role-based navigation is a frontend demonstration, not an authorization or security control.
    </p>
  );
}

export default function RoleDashboard() {
  const role = api.getCurrentRole();
  if (role === 'ADMIN') return <DashboardPage />;
  if (role === 'PATIENT') return <PatientPortalPage section="overview" />;
  if (role === 'DOCTOR') return <ClinicalDashboard />;
  if (role === 'STAFF') return <StaffDashboard />;
  return <UnavailableNotice module="Role dashboard" detail="Your account does not have a recognized frontend role. Contact an administrator to verify your account configuration." />;
}
