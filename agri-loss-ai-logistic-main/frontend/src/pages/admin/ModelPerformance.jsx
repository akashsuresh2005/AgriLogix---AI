import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import adminApi from '@/api/admin';
import { AlertCircle, Cpu } from 'lucide-react';

export default function ModelPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getModelPerformance()
      .then((response) => setData(response.data))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load model artifact metadata.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Performance & Artifact Telemetry"
        subtitle="Monitoring calibrated Gradient Boosting ML model metrics and artifacts"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {loading ? (
        <div className="py-12"><LoadingState label="Reading loaded model artifact metadata..." /></div>
      ) : data && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e5e9df] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Artifact Status</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Cpu className="h-5 w-5 text-forest-600" />
                {data.artifact_status}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5e9df] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Recorded Training Time</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{data.trained_at || 'Unavailable'}</p>
            </div>
            <div className="rounded-2xl border border-[#e5e9df] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Classifier</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{data.classifier?.type || 'Unavailable'}</p>
              <p className="mt-1 text-xs text-slate-500">Input features: {data.classifier?.input_features ?? 'Unavailable'}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5e9df] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Pipeline Task Architecture</h2>
            <p className="mt-1 text-sm text-slate-500">
              Multi-stage inference combining ensemble classification with targeted regression pipelines.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-forest-200/80 bg-forest-50/50 p-4">
                <p className="text-xs uppercase font-bold tracking-wider text-forest-800">Risk Classifier</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Ensemble Voting / GBDT</p>
                <p className="mt-1 text-xs text-slate-500">Predicts spoilage probability and categorical risk bracket (Low, Medium, High).</p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                <p className="text-xs uppercase font-bold tracking-wider text-amber-800">Loss Regressor</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Gradient Boosting Regressor</p>
                <p className="mt-1 text-xs text-slate-500">Estimates financial drain and expected volume loss percentage.</p>
              </div>
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
                <p className="text-xs uppercase font-bold tracking-wider text-blue-800">Shelf-Life Regressor</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Residual Shelf-Life Predictor</p>
                <p className="mt-1 text-xs text-slate-500">Estimates remaining viable days under given storage & transit conditions.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5e9df] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Model Outputs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Classifier classes: <span className="font-semibold text-slate-700">{(data.classifier?.classes || []).join(', ') || 'Unavailable'}</span>
            </p>
            <div className="mt-4 divide-y divide-[#e5e9df]">
              {(data.regressors || []).map((model) => (
                <div key={model.name} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span className="font-semibold text-slate-900">{model.name}</span>
                  <span className="text-slate-500">{model.type} · {model.input_features ?? 'Unavailable'} input features</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5e9df] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Prediction Feature Schema ({data.features?.length || 0})</h2>
            {data.features?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.features.map((feature) => (
                  <span key={feature} className="rounded-lg border border-forest-200/80 bg-forest-50/70 px-3 py-1.5 text-xs font-mono font-medium text-forest-800">
                    {feature}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Feature list unavailable.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
