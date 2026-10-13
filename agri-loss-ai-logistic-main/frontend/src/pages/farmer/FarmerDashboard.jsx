import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import MetricCard from '@/components/cards/MetricCard';
import RiskBadge from '@/components/badges/RiskBadge';
import StatusBadge from '@/components/badges/StatusBadge';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import farmersApi from '@/api/farmers';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate, formatPercentage } from '@/utils/formatters';
import {
  Sprout,
  History,
  TrendingDown,
  Warehouse,
  Truck,
  PlusCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await farmersApi.getFarmerDashboard();
        setData(resp.data);
      } catch (err) {
        setError(t('dashboard_error'));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState label={t('loading_dashboard')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t('welcome_back')}, ${user?.full_name || user?.username}`}
        subtitle={t('dashboard_subtitle')}
        action={
          <Link
            to="/farmer/predict"
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition-all shadow-xs hover:shadow-subtle flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4 text-emerald-200" />
            <span>{t('new_prediction')}</span>
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('total_predictions')}
          value={data?.total_predictions ?? 0}
          subtext={t('ml_assessments')}
          icon={Sprout}
          color="primary"
        />
        <MetricCard
          title={t('avg_spoilage_rate')}
          value={formatPercentage(data?.avg_spoilage_rate ?? 0, 1)}
          subtext={t('mean_probability')}
          icon={TrendingDown}
          color="accent"
          trend={data?.avg_spoilage_rate > 50 ? 'High Risk' : 'Normal'}
          trendPositive={data?.avg_spoilage_rate < 30}
        />
        <MetricCard
          title={t('active_shipments')}
          value={data?.total_shipments ?? 0}
          subtext={t('batches_transit')}
          icon={Truck}
          color="info"
        />
        <MetricCard
          title={t('total_tons_shipped')}
          value={`${(data?.total_tons_shipped ?? 0).toFixed(1)} MT`}
          subtext={t('cumulative_tonnage')}
          icon={Warehouse}
          color="primary"
        />
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/farmer/predict"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-emerald-600/50 hover:shadow-card transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
              <Sprout className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-emerald-800 transition-colors">
              {t('analyze_spoilage')}
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {t('analyze_crop_copy')}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
            <span>Start Assessment</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/farmer/warehouses"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-600/50 hover:shadow-card transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-amber-100 transition-all">
              <Warehouse className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-amber-800 transition-colors">
              {t('find_storage')}
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {t('find_storage_copy')}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
            <span>Explore Facilities</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/farmer/shipments"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-600/50 hover:shadow-card transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-sky-100 transition-all">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-sky-800 transition-colors">
              {t('book_track_transit')}
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              {t('dispatch_copy')}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform">
            <span>Track & Dispatch</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Active Shipments & Recent Predictions Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Shipments */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
            <h4 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <Truck className="w-5 h-5 text-emerald-800" />
              <span>{t('active_transit')}</span>
            </h4>
            <Link to="/farmer/shipments" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center">
              <span>{t('view_all')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {!data?.active_shipments || data.active_shipments.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={t('no_active_shipments')}
              description={t('no_transit_farmer')}
            />
          ) : (
            <div className="space-y-3">
              {data.active_shipments.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-stone-50/70 border border-stone-200/80 flex items-center justify-between transition-colors hover:bg-stone-50">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900 text-sm">{s.crop} ({s.tonnage} MT)</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {t('destination')}: <span className="text-stone-800 font-medium">{s.destination}</span> • {t('booking')}: <span className="font-mono text-stone-600">{s.booking_id}</span>
                    </p>
                  </div>
                  <RiskBadge risk={s.risk_status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Predictions */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
            <h4 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <History className="w-5 h-5 text-emerald-800" />
              <span>{t('recent_predictions')}</span>
            </h4>
            <Link to="/farmer/predictions" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center">
              <span>{t('view_history')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {!data?.recent_predictions || data.recent_predictions.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title={t('no_predictions')}
              description={t('no_prediction_outputs')}
            />
          ) : (
            <div className="space-y-3">
              {data.recent_predictions.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-stone-50/70 border border-stone-200/80 flex items-center justify-between transition-colors hover:bg-stone-50">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900 text-sm">{p.crop} ({p.quantity_tons} MT)</span>
                      <span className="text-xs text-stone-500">• {p.district}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {t('probability')}: <span className="font-semibold text-stone-900">{(p.spoilage_probability * 100).toFixed(1)}%</span> • {t('shelf')}: <span className="text-stone-800 font-medium">{p.shelf_life_days.toFixed(1)} {t('days')}</span>
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{formatDate(p.created_at)}</span>
                    </p>
                  </div>
                  <RiskBadge risk={p.risk_level} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
