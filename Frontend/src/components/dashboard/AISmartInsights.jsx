import React from 'react';
import { Zap } from 'lucide-react';

export default function AISmartInsights() {
  const insights = [
    {
      title: 'AI Insight: Hospital activity is high today',
      detail: 'Hospital activity is high today with 150 patients, 85% bed occupancy, and 12 surgeries scheduled.',
    },
    {
      title: 'Provide 3 short, professional, and actionable predictive insights',
      detail: 'Predictive modeling suggests ICU capacity reaches 92% by 18:00 UTC. Prepare Ward B overflow.',
    },
    {
      title: '150 patients were admitted today, higher than usual',
      detail: 'Consider scheduling 4 supplementary nursing staff for the night shift in General Care.',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div className="flex items-center space-x-2 mb-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          AI Smart insights
        </h3>
      </div>

      <div className="space-y-4">
        {insights.map((item, index) => (
          <div key={index} className="flex items-start space-x-3.5 group">
            {/* Dark circular pill with lightning icon from reference */}
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-white stroke-none" />
            </div>

            <div className="text-xs text-gray-700 leading-relaxed">
              <p>
                <strong className="text-gray-900 font-semibold">{item.title}</strong>{' '}
                <span className="text-gray-600">{item.detail}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

