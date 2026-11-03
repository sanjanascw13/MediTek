import React, { useEffect, useState } from 'react';
import HeroBanner from '../components/dashboard/HeroBanner';
import PatientChart from '../components/dashboard/PatientChart';
import AppointmentsTimeline from '../components/dashboard/AppointmentsTimeline';
import OperationsTable from '../components/dashboard/OperationsTable';
import { api } from '../services/api';
import { ErrorState, LoadingState } from '../components/ApiState';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const requests = [
          api.getDashboardStats(),
          api.getPatientChartData(),
          api.getAppointments(),
        ];
        if (api.isMockMode()) requests.push(api.getOperations());
        const results = await Promise.allSettled(requests);
        const [statsResult, chartResult, appointmentsResult] = results;
        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
          setOperations(statsResult.value.recentOperations || (
            results[3]?.status === 'fulfilled' ? results[3].value : []
          ));
        }
        if (chartResult.status === 'fulfilled') setPatientData(chartResult.value);
        if (appointmentsResult.status === 'fulfilled') setAppointments(appointmentsResult.value);
        const failed = results.filter((result) => result.status === 'rejected');
        if (failed.length > 0) {
          setError(failed.map((result) => api.getErrorMessage(result.reason)).join(' '));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {api.isMockMode() && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Development demo data only. Role-based navigation is a frontend demonstration, not an authorization or security control.
        </p>
      )}
      {loading && <LoadingState label="Loading dashboard data..." />}
      {error && <ErrorState message={error} />}

      {/* 1. Hero Card with Stats & Mini Charts */}
      <HeroBanner stats={stats} showDemoTrends={api.isMockMode()} />

      {/* 2. Middle Grid: Patient Chart (Donut) & Appointments Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 h-full">
          <PatientChart data={patientData} />
        </div>
        <div className="lg:col-span-7 h-full">
          <AppointmentsTimeline appointments={appointments} />
        </div>
      </div>

      {/* 3. Bottom Section: Operations Table */}
      <OperationsTable operations={operations} />
    </div>
  );
}
