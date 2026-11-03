import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building2, Search, MapPin, Activity, ShieldAlert, Heart, Syringe, Sparkles } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ApiState';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await api.getDepartments();
      setDepartments(Array.isArray(raw) ? raw : []);
    } catch (requestError) {
      setError(api.getErrorMessage(requestError, 'Unable to load departments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const filtered = (Array.isArray(departments) ? departments : []).filter((d) =>
    Boolean(d) && [d.departmentName, d.location, d.subtype, d.detail].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Clinical Departments & Facilities</h2>
          <p className="text-sm text-gray-500">10 specialized clinical divisions (ETU, ICU, OPD, Lab, Pharmacy, Radiology, OR, Maternity, Clinic & Medical Units)</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search department, wing, subtype..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadDepartments} />}
      {loading && <LoadingState label="Loading departments..." />}
      {!loading && !error && filtered.length === 0 && <EmptyState>{departments.length ? 'No departments match your search.' : 'No departments are configured.'}</EmptyState>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((dept) => (
          <div
            key={dept.departmentId}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-800">
                  {dept.subtype || 'DEPARTMENT'}
                </span>
                <span className="text-xs font-mono text-gray-400">{dept.departmentId}</span>
              </div>

              <h4 className="text-base font-bold text-gray-900 group-hover:text-lime-700 transition-colors">
                {dept.departmentName}
              </h4>

              <div className="mt-3 p-3 rounded-2xl bg-gray-50 text-xs text-gray-600 border border-gray-100">
                {dept.detail && <p className="font-semibold text-gray-800">{dept.detail}</p>}
                <div className="flex items-center gap-1.5 text-gray-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                  <span className="truncate">{dept.location}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span> Directory record
              </span>
              <span className="text-xs text-gray-500">{dept.departmentId}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
