import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/forms/Button';
import { predictionsApi } from '@/api/predictions';
import { useLanguage } from '@/context/LanguageContext';
import {
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

const RISK_COLORS = {
  HIGH: '#dc2626',
  MEDIUM: '#d97706',
  LOW: '#16a34a',
};

export default function LossAnalysis() {
  const { t } = useLanguage();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('ALL');

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await predictionsApi.listPredictions({ page: 1, page_size: 100 });
      setPredictions(res.data?.predictions || []);
    } catch (err) {
      setError(err.response?.data?.detail || t('analysis_error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredPredictions = useMemo(() => {
    if (selectedCrop === 'ALL') return predictions;
    return predictions.filter((p) => p.crop === selectedCrop);
  }, [predictions, selectedCrop]);

  const uniqueCrops = useMemo(() => {
    const set = new Set(predictions.map((p) => p.crop));
    return Array.from(set);
  }, [predictions]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    if (!filteredPredictions.length) {
      return {
        totalPredictions: 0,
        totalTons: 0,
        totalFinancialLoss: 0,
        totalLossTons: 0,
        avgLossPct: 0,
        avgShelfLife: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
      };
    }

    let totalTons = 0;
    let totalFinancialLoss = 0;
    let totalLossTons = 0;
    let sumLossPct = 0;
    let sumShelfLife = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    filteredPredictions.forEach((p) => {
      const qTons = Number(p.quantity_tons) || 0;
      const fLoss = Number(p.financial_loss) || 0;
      const lPct = Number(p.loss_percentage) || 0;
      const sLife = Number(p.shelf_life_days) || 0;

      totalTons += qTons;
      totalFinancialLoss += fLoss;
      totalLossTons += (lPct / 100) * qTons;
      sumLossPct += lPct;
      sumShelfLife += sLife;

      const risk = (p.risk_level || 'LOW').toUpperCase();
      if (risk === 'HIGH') highRiskCount++;
      else if (risk === 'MEDIUM') mediumRiskCount++;
      else lowRiskCount++;
    });

    const count = filteredPredictions.length;
    return {
      totalPredictions: count,
      totalTons: totalTons.toFixed(1),
      totalFinancialLoss: Math.round(totalFinancialLoss),
      totalLossTons: totalLossTons.toFixed(2),
      avgLossPct: (sumLossPct / count).toFixed(1),
      avgShelfLife: (sumShelfLife / count).toFixed(1),
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };
  }, [filteredPredictions]);

  // Crop-wise breakdown data for Bar Chart
  const cropBarData = useMemo(() => {
    const cropMap = {};
    predictions.forEach((p) => {
      const c = p.crop;
      if (!cropMap[c]) {
        cropMap[c] = { crop: c, financialLoss: 0, lossTons: 0, totalTons: 0 };
      }
      const q = Number(p.quantity_tons) || 0;
      const f = Number(p.financial_loss) || 0;
      const l = Number(p.loss_percentage) || 0;
      cropMap[c].financialLoss += f;
      cropMap[c].lossTons += (l / 100) * q;
      cropMap[c].totalTons += q;
    });

    return Object.values(cropMap)
      .map((item) => ({
        ...item,
        financialLoss: Math.round(item.financialLoss),
        lossTons: Number(item.lossTons.toFixed(2)),
      }))
      .sort((a, b) => b.financialLoss - a.financialLoss);
  }, [predictions]);

  // Risk distribution for Pie Chart
  const riskPieData = useMemo(() => {
    return [
      { name: 'Low Risk', value: summary.lowRiskCount, color: RISK_COLORS.LOW },
      { name: 'Medium Risk', value: summary.mediumRiskCount, color: RISK_COLORS.MEDIUM },
      { name: 'High Risk', value: summary.highRiskCount, color: RISK_COLORS.HIGH },
    ].filter((item) => item.value > 0);
  }, [summary]);

  // Chronological Trend data
  const trendData = useMemo(() => {
    return [...filteredPredictions]
      .reverse()
      .slice(-15)
      .map((p, idx) => ({
        index: idx + 1,
        crop: p.crop,
        date: new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        spoilageProb: Number(((p.spoilage_probability || 0) * 100).toFixed(1)),
        lossPct: Number((p.loss_percentage || 0).toFixed(1)),
        shelfLife: Number((p.shelf_life_days || 0).toFixed(1)),
      }));
  }, [filteredPredictions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('loss_analysis_title')}
          subtitle={t('loss_loading_subtitle')}
        />
        <div className="p-12 text-center text-stone-500 bg-white border border-stone-200/80 rounded-2xl shadow-subtle">
          <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">{t('chart_loading')}</p>
        </div>
      </div>
    );
  }

  if (!predictions.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('loss_analysis_title')}
          subtitle={t('loss_loading_subtitle')}
        />
        <div className="bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-4 shadow-subtle">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
            <TrendingDown className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">{t('no_records_yet')}</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            {t('run_analysis_unlock')}
          </p>
          <div className="pt-2">
            <Link to="/farmer/predict">
              <Button variant="primary">
                <span>{t('run_first_prediction')}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('loss_analysis_title')}
          subtitle={t('loss_data_subtitle')}
        />
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide shrink-0">{t('filter_crop')}</label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-sm font-medium text-stone-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          >
            <option value="ALL">{t('all_assessed_crops')} ({predictions.length})</option>
            {uniqueCrops.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Top Level Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('projected_loss')}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">₹{summary.totalFinancialLoss.toLocaleString()}</div>
          <p className="text-xs text-stone-500 mt-1">
            {t('projected_batches')} {summary.totalPredictions}
          </p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('volume_at_risk')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">{summary.totalLossTons} Tons</div>
          <p className="text-xs text-stone-500 mt-1">
            {t('out_of_tons')} {summary.totalTons}
          </p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('avg_spoilage')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">{summary.avgLossPct}%</div>
          <p className="text-xs text-stone-500 mt-1">{t('biophysical_loss')}</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('avg_shelf')}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">{summary.avgShelfLife} Days</div>
          <p className="text-xs text-stone-500 mt-1">{t('dispatch_window')}</p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crop-wise Financial Loss Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                {t('financial_by_crop')}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('economic_risk_crop')}
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropBarData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3ee" />
                <XAxis
                  dataKey="crop"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  }}
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, t('estimated_loss')]}
                />
                <Bar dataKey="financialLoss" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut Chart */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              {t('risk_rating')}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('risk_thresholds')}
            </p>
          </div>
          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  }}
                  formatter={(val, name) => [`${val} Batches`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-100 text-center">
            <div>
              <div className="text-xs font-semibold text-emerald-800">{t('low_risk')}</div>
              <div className="text-lg font-bold text-stone-900">{summary.lowRiskCount}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-700">{t('medium_risk')}</div>
              <div className="text-lg font-bold text-stone-900">{summary.mediumRiskCount}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-rose-700">{t('high_risk')}</div>
              <div className="text-lg font-bold text-stone-900">{summary.highRiskCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Spoilage vs Shelf-Life Trend Chart */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              {t('spoilage_shelf_trend')}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('trend_description')}
            </p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3ee" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#15803d" fontSize={12} unit="%" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" stroke="#0284c7" fontSize={12} unit="d" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spoilageProb"
                name="Spoilage Probability (%)"
                stroke="#15803d"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="shelfLife"
                name="Remaining Shelf Life (Days)"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actionable Preventative Agronomic Recommendations */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
        <h3 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          {t('mitigation_directives')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <h4 className="text-sm font-semibold text-emerald-800">1. {t('cold_chain_allocation')}</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('cold_chain_paragraph')}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <h4 className="text-sm font-semibold text-amber-800">2. {t('vibration_damping')}</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('vibration_paragraph')}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <h4 className="text-sm font-semibold text-sky-800">3. {t('liquidation_strategy')}</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('liquidation_paragraph')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
