import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/common/PageHeader';
import RiskBadge from '@/components/badges/RiskBadge';
import Button from '@/components/forms/Button';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import predictionsApi from '@/api/predictions';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate, formatCurrency, formatPercentage } from '@/utils/formatters';
import { ALL_CROPS, DISTRICT_LIST } from '@/utils/constants';
import {
  History,
  Search,
  Filter,
  Eye,
  X,
  Sprout,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Camera,
  Calendar,
  Clock,
  Warehouse,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const RISK_COLORS = {
  Low: '#15803d',
  Medium: '#b45309',
  High: '#b91c1c',
  Critical: '#6b21a8',
};

export default function MyPredictions() {
  const { t } = useLanguage();
  const [predictions, setPredictions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [activeTab, setActiveTab] = useState('table'); // 'table' or 'analytics'

  // Selected detail modal prediction
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, page_size: 50 };
      if (selectedCrop) params.crop = selectedCrop;
      if (selectedDistrict) params.district = selectedDistrict;

      const resp = await predictionsApi.listPredictions(params);
      setPredictions(resp.data.predictions || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      setError(t('failed_history'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [page, selectedCrop, selectedDistrict]);

  // Client-side Analytics Computations
  const analyticsData = useMemo(() => {
    if (!predictions.length) return { riskDistribution: [], cropLossData: [], trendData: [] };

    const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    const cropLossMap = {};

    predictions.forEach((p) => {
      const risk = String(p.risk_level || '').trim().toUpperCase();
      const chartRisk = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }[risk];
      if (chartRisk) {
        riskCounts[chartRisk] += 1;
      }

      if (!cropLossMap[p.crop]) {
        cropLossMap[p.crop] = 0;
      }
      cropLossMap[p.crop] += p.financial_loss || 0;
    });

    const riskDistribution = Object.keys(riskCounts)
      .filter((k) => riskCounts[k] > 0)
      .map((k) => ({ name: k, value: riskCounts[k], color: RISK_COLORS[k] || '#64748b' }));

    const cropLossData = Object.keys(cropLossMap).map((crop) => ({
      crop,
      loss: Math.round(cropLossMap[crop]),
    }));

    const trendData = [...predictions]
      .reverse()
      .slice(0, 15)
      .map((p) => ({
        date: formatDate(p.created_at).split(',')[0],
        spoilage: Number((p.spoilage_probability * 100).toFixed(1)),
        loss: p.loss_percentage,
      }));

    return { riskDistribution, cropLossData, trendData };
  }, [predictions]);

  // Native CSV Export Function
  const exportToCSV = () => {
    if (!predictions.length) return;

    const headers = ['ID', 'Crop', 'District', 'Quantity (MT)', 'Spoilage (%)', 'Loss (%)', 'Financial Risk (INR)', 'Shelf Life (Days)', 'Risk Status', 'Created At'];
    const rows = predictions.map((p) => [
      p.id,
      p.crop,
      p.district,
      p.quantity_tons,
      (p.spoilage_probability * 100).toFixed(1),
      p.loss_percentage.toFixed(1),
      Math.round(p.financial_loss),
      p.shelf_life_days.toFixed(1),
      p.risk_level,
      formatDate(p.created_at),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crop_predictions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('prediction_history')}
        subtitle={t('history_subtitle')}
      />

      {/* Filter and Tab Control Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="w-full sm:w-48">
            <Select
              value={selectedCrop}
              onChange={(e) => {
                setSelectedCrop(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: t('all_crops') },
                ...ALL_CROPS.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: t('all_districts') },
                ...DISTRICT_LIST.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          {/* Tab Toggles */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              {t('log_table')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              {t('visual_analytics')}
            </button>
          </div>

          {/* Export CSV Button */}
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!predictions.length}>
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            {t('export_csv')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingState label={t('loading_history')} />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      ) : predictions.length === 0 ? (
        <EmptyState
          icon={History}
          title={t('no_prediction_records')}
          description={t('filter_no_logs')}
        />
      ) : activeTab === 'analytics' ? (
        /* Analytics Visualizations Dashboard */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Level Distribution Pie Chart */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-subtle">
              <h3 className="text-sm font-bold text-stone-900 flex items-center">
                <PieChartIcon className="w-4 h-4 mr-2 text-emerald-700" />
                {t('risk_breakdown')}
              </h3>
              <div className="h-64">
                {analyticsData.riskDistribution.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-stone-400">{t('no_risk_data')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '0.75rem', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Financial Loss by Crop Bar Chart */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-subtle">
              <h3 className="text-sm font-bold text-stone-900 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-emerald-700" />
                {t('crop_loss_chart')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.cropLossData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3ee" />
                    <XAxis dataKey="crop" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val) => [`₹${val.toLocaleString()}`, t('estimated_loss')]}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '0.75rem', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="loss" fill="#15803d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Spoilage Probability Trend Chart */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-subtle">
            <h3 className="text-sm font-bold text-stone-900 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-emerald-700" />
              {t('probability_trend')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.trendData}>
                  <defs>
                    <linearGradient id="spoilageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803d" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3ee" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '0.75rem', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <Area type="monotone" dataKey="spoilage" stroke="#15803d" strokeWidth={2} fillOpacity={1} fill="url(#spoilageGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Prediction Logs Table */
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                  <th className="p-4">{t('photo')}</th>
                  <th className="p-4">{t('crop')}</th>
                  <th className="p-4">{t('district')}</th>
                  <th className="p-4">{t('quantity')}</th>
                  <th className="p-4">{t('spoilage_prob_short')}</th>
                  <th className="p-4">{t('loss_estimate')}</th>
                  <th className="p-4">{t('shelf_life')}</th>
                  <th className="p-4">{t('risk_level')}</th>
                  <th className="p-4">{t('date')}</th>
                  <th className="p-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      {p.image_data ? (
                        <img
                          src={p.image_data}
                          alt={p.crop}
                          onClick={() => setSelectedPrediction(p)}
                          className="w-10 h-10 object-cover rounded-lg border border-stone-200 cursor-pointer hover:border-emerald-600 hover:scale-105 transition"
                          title={t('enlarge')}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-stone-900">{p.crop}</td>
                    <td className="p-4 text-stone-600">{p.district}</td>
                    <td className="p-4 text-stone-700 font-medium">{p.quantity_tons} MT</td>
                    <td className="p-4 font-bold text-emerald-800">
                      {(p.spoilage_probability * 100).toFixed(1)}%
                    </td>
                    <td className="p-4 text-stone-700">
                      {p.loss_percentage.toFixed(1)}% <span className="text-stone-500 font-normal">({formatCurrency(p.financial_loss)})</span>
                    </td>
                    <td className="p-4 text-stone-700 font-medium">{p.shelf_life_days.toFixed(1)} Days</td>
                    <td className="p-4">
                      <RiskBadge risk={p.risk_level} />
                    </td>
                    <td className="p-4 text-xs text-stone-500 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPrediction(p)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        {t('inspect')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-elevated">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  {t('prediction_log')} #{selectedPrediction.id}
                </span>
                <h3 className="text-xl font-bold text-stone-900 mt-0.5">
                  {selectedPrediction.crop} {t('batch_details')}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  Recorded on: {formatDate(selectedPrediction.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedPrediction(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="text-stone-500 block mb-1">{t('risk_status')}</span>
                <div><RiskBadge risk={selectedPrediction.risk_level} /></div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="text-stone-500 block">{t('probability_short')}</span>
                <span className="text-sm font-bold text-stone-900 mt-1 block">
                  {(selectedPrediction.spoilage_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="text-stone-500 block">{t('shelf_life')}</span>
                <span className="text-sm font-bold text-stone-900 mt-1 block">
                  {selectedPrediction.shelf_life_days.toFixed(1)} Days
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="text-stone-500 block">{t('financial_risk')}</span>
                <span className="text-sm font-bold text-emerald-800 mt-1 block">
                  {formatCurrency(selectedPrediction.financial_loss)}
                </span>
              </div>
            </div>

            {/* Crop Image Preview in Modal if present */}
            {selectedPrediction.image_data && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-4">
                <img
                  src={selectedPrediction.image_data}
                  alt={t('crop_sample_preview')}
                  className="w-24 h-24 object-cover rounded-xl border border-stone-300 shrink-0 shadow-xs"
                />
                <div className="text-xs space-y-1 text-stone-600">
                  <div className="font-semibold text-stone-900 text-sm">{t('sample_scan_attached')}</div>
                  <div className="text-stone-500">
                    {t('scan_explanation')}
                  </div>
                  {selectedPrediction.picture_spoilage_prob !== null && selectedPrediction.picture_spoilage_prob !== undefined && (
                    <div className="text-emerald-800 font-mono text-[11px] pt-1 font-semibold">
                      {t('cv_spoilage_score')}: {(selectedPrediction.picture_spoilage_prob * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5 border-t border-stone-100 pt-4 text-xs">
              <h4 className="font-bold text-stone-900">{t('model_metadata')}:</h4>
              <div className="grid grid-cols-2 gap-2.5 text-stone-500">
                <div>{t('district')}: <span className="text-stone-900 font-medium">{selectedPrediction.district}</span></div>
                <div>{t('temp_humidity')}: <span className="text-stone-900 font-medium">{selectedPrediction.temperature}°C / {selectedPrediction.humidity}%</span></div>
                <div>{t('road_quality_metadata')}: <span className="text-stone-900 font-medium">{selectedPrediction.road_condition}</span></div>
                <div>{t('transit_days_metadata')}: <span className="text-stone-900 font-medium">{selectedPrediction.actual_transit_days} / {selectedPrediction.expected_transit_days} {t('days')}</span></div>
                <div>{t('storage_days_metadata')}: <span className="text-stone-900 font-medium">{selectedPrediction.storage_days} {t('days')}</span></div>
                <div>{t('facility_label')}: <span className="text-stone-900 font-medium">{selectedPrediction.recommended_facility || t('unavailable')}</span></div>
              </div>
            </div>

            <div className="flex justify-end border-t border-stone-100 pt-4">
              <Button variant="outline" onClick={() => setSelectedPrediction(null)}>
                {t('close_inspection')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
