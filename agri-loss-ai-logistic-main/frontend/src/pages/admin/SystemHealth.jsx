import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import apiClient from '@/api/client';
import { Activity, CheckCircle2, ShieldCheck, Database, Server } from 'lucide-react';

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        const resp = await apiClient.get('/api/health');
        setHealthData(resp.data);
      } catch (e) {
        setHealthData({ status: 'unhealthy', error: e.message });
      } finally {
        setLoading(false);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health & Diagnostics"
        subtitle="FastAPI backend status, API response health, and JWT security configuration"
      />

      {loading ? (
        <div className="py-12"><LoadingState label="Running backend health diagnostics..." /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-forest-50 border border-forest-200 text-forest-700 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">FastAPI Backend Service</h3>
                <p className="text-xs text-slate-500">Endpoint: http://127.0.0.1:8000/api/health</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              healthData?.status === 'unhealthy'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-forest-50 text-forest-700 border-forest-200'
            }`}>
              {healthData?.status || 'Healthy'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 space-y-2 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center mb-3">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Service Name</h4>
              <p className="text-sm text-slate-700 font-mono bg-forest-50/50 p-2 rounded-lg border border-forest-100">
                {healthData?.service || 'Agri Loss AI Logistic API'}
              </p>
            </div>

            <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 space-y-2 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Database Status</h4>
              <p className={`text-sm font-mono p-2 rounded-lg border ${
                healthData?.database === 'healthy'
                  ? 'bg-forest-50 text-forest-800 border-forest-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {healthData?.database === 'healthy' ? 'Connected (SQLite WAL)' : (healthData?.database || 'Checking...')}
              </p>
            </div>

            <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 space-y-2 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">API Version</h4>
              <p className="text-sm text-slate-700 font-mono bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                v{healthData?.version || '1.0.0'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
