import React, { useState } from 'react';
import { Microscope, FileText, CheckCircle2, Clock, Plus, Search, User } from 'lucide-react';

export default function LabsPage() {
  const [activeTab, setActiveTab] = useState('TESTS');

  const labTests = [
    {
      testId: 'LAB-001',
      patientName: 'John Deo (PAT-000001)',
      orderedBy: 'Dr. Robert Chen',
      testType: 'Complete Blood Count (CBC) with Platelets',
      requestedAt: '2026-10-28 09:30 UTC',
      status: 'COMPLETED',
      reportId: 'REP-001',
      summary: 'Platelets normal (240,000/mcL). Slight elevation in WBC count (11,500/mcL). Follow-up in 2 weeks.'
    },
    {
      testId: 'LAB-002',
      patientName: 'Jens Brincker (PAT-000002)',
      orderedBy: 'Dr. Sarah Connor',
      testType: 'Lipid Profile & Serum Electrolytes',
      requestedAt: '2026-10-30 11:15 UTC',
      status: 'COMPLETED',
      reportId: 'REP-002',
      summary: 'Total cholesterol 195 mg/dL. LDL 110 mg/dL. Electrolytes within normal physiological range.'
    },
    {
      testId: 'LAB-003',
      patientName: 'Elena Rostova (PAT-000003)',
      orderedBy: 'Dr. Bruce Wayne',
      testType: 'Serum Ferritin & Dengue Serology',
      requestedAt: '2026-10-31 08:00 UTC',
      status: 'PENDING',
      reportId: null,
      summary: null
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Clinical Pathology & Diagnostic Laboratory</h2>
          <p className="text-sm text-gray-500">Diagnostic test requisitions, doctor orders, and formal lab reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('TESTS')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'TESTS' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Ordered Tests
          </button>
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'REPORTS' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Verified Reports
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="space-y-4">
          {labTests.map((t) => (
            <div
              key={t.testId}
              className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-lime-800">{t.testId}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-gray-900">{t.testType}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                  <span>Patient: <strong className="text-gray-800">{t.patientName}</strong></span>
                  <span>Ordered by: <strong className="text-gray-800">{t.orderedBy}</strong></span>
                  <span>Requested: {t.requestedAt}</span>
                </div>

                {t.summary && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 text-xs text-gray-700">
                    <strong className="text-gray-900 block mb-0.5">Report Result ({t.reportId}):</strong>
                    {t.summary}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex gap-2">
                {t.status === 'COMPLETED' ? (
                  <button className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> View PDF
                  </button>
                ) : (
                  <button className="px-4 py-2 rounded-xl bg-[#a3e635] text-[#142008] font-bold text-xs hover:bg-[#8ddb16] transition-all">
                    Upload Results
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

