import React, { useEffect, useState } from 'react';
import HeroBanner from '../components/dashboard/HeroBanner';
import PatientChart from '../components/dashboard/PatientChart';
import AppointmentsTimeline from '../components/dashboard/AppointmentsTimeline';
import AISmartInsights from '../components/dashboard/AISmartInsights';
import OperationsTable from '../components/dashboard/OperationsTable';
import { api } from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, chartRes, apptRes, opRes] = await Promise.all([
          api.getDashboardStats(),
          api.getPatientChartData(),
          api.getAppointments(),
          api.getOperations()
        ]);
        setStats(statsRes);
        setPatientData(chartRes);
        setAppointments(apptRes);
        setOperations(opRes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Card with Stats & Mini Charts */}
      <HeroBanner stats={stats} />

      {/* 2. Middle Grid: Patient Chart (Donut), Appointments Timeline, AI Smart Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 h-full">
          <PatientChart data={patientData} />
        </div>
        <div className="lg:col-span-5 h-full">
          <AppointmentsTimeline appointments={appointments} />
        </div>
        <div className="lg:col-span-3 h-full">
          <AISmartInsights />
        </div>
      </div>

      {/* 3. Bottom Section: Operations Table */}
      <OperationsTable operations={operations} />
    </div>
  );
}

