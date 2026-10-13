import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import MetricCard from '@/components/cards/MetricCard';
import StatusBadge from '@/components/badges/StatusBadge';
import RiskBadge from '@/components/badges/RiskBadge';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import warehousesApi from '@/api/warehouses';
import shipmentsApi from '@/api/shipments';
import { useAuth } from '@/hooks/useAuth';
import { Boxes, Truck, ShieldAlert, Activity, ArrowRight, Warehouse, Shield, AlertTriangle, Thermometer, MapPin } from 'lucide-react';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [activeShipments, setActiveShipments] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [simulateFault, setSimulateFault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [whResp, shipResp] = await Promise.all([
          warehousesApi.listWarehouses(),
          shipmentsApi.listActiveShipments(),
        ]);
        const whs = whResp.data || [];
        setWarehouses(whs);
        setActiveShipments(shipResp.data || []);
        if (whs.length > 0) {
          setSelectedWarehouseId(whs[0].id.toString());
        }
      } catch (e) {
        setLoadError(e.response?.data?.detail || 'Unable to load assigned facility telemetry.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const totalCapacity = warehouses.reduce((acc, w) => acc + w.capacity_mt, 0);
  const avgOccupancy = warehouses.length
    ? (warehouses.reduce((acc, w) => acc + w.occupancy_pct, 0) / warehouses.length).toFixed(1)
    : null;
  const highRiskCount = activeShipments.filter((s) => s.risk_status?.includes('HIGH')).length;

  if (loading) {
    return <div className="py-12"><LoadingState label="Loading Warehouse Management Telemetry..." /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Manager Operational Hub"
        subtitle="Capacity Utilization, Gate Receiving Inspections, and Stock Risk Dispatches"
      />

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{loadError}</span>
        </div>
      )}

      {/* Admin Warehouse Selector Bar */}
      {isAdmin && warehouses.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
          <span className="text-xs font-bold text-amber-800 flex items-center uppercase tracking-wider">
            <Shield className="w-4 h-4 mr-2 text-amber-600" />
            Admin Facility Manager Selector
          </span>
          <div className="w-full sm:w-80">
            <Select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({
                value: w.id.toString(),
                label: `${w.facility_name} (${w.district})`,
              }))}
            />
          </div>
        </div>
      )}

      {/* Cooling Plant Fault Simulator Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center shrink-0">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">Refrigeration Plant Telemetry</h4>
            <p className="text-xs text-stone-500">Simulate HVAC compressor malfunction & Q10 respiration acceleration</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSimulateFault(!simulateFault)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border shadow-xs ${
            simulateFault
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${simulateFault ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`} />
          <span>{simulateFault ? 'Simulating HVAC Fault (14.5°C Spike)' : 'Normal Operation (4.0°C)'}</span>
        </button>
      </div>

      {/* Fault Alert Banner */}
      {simulateFault && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h4 className="font-bold text-rose-950 text-sm">CRITICAL ALERT: Warehouse Cooling Failure Simulation</h4>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              Internal storage room temperatures drifted from <strong className="font-bold">4.0°C</strong> up to <strong className="font-bold text-rose-950">14.5°C</strong>.
              According to the biophysical <strong className="font-bold">Q10 Respiration Formula</strong>, crop decay rates have accelerated by <strong className="font-bold text-rose-950">2.8x</strong>!
            </p>
          </div>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Facility Occupancy"
          value={avgOccupancy == null ? '—' : `${avgOccupancy}%`}
          subtext={warehouses.length ? `Across ${warehouses.length} assigned hubs` : 'No assigned facilities'}
          icon={Boxes}
          color="accent"
          trend={avgOccupancy == null ? undefined : avgOccupancy > 85 ? 'High Occupancy' : 'Normal'}
          trendPositive={avgOccupancy == null ? undefined : avgOccupancy <= 85}
        />
        <MetricCard
          title="Total Registered Capacity"
          value={warehouses.length ? `${totalCapacity} MT` : '—'}
          subtext={warehouses.length ? 'Combined storage tonnage' : 'No assigned facilities'}
          icon={Warehouse}
          color="primary"
        />
        <MetricCard
          title="Incoming In-Transit"
          value={warehouses.length ? activeShipments.length : '—'}
          subtext={warehouses.length ? 'Batches en route to hubs' : 'No assigned facilities'}
          icon={Truck}
          color="info"
        />
        <MetricCard
          title="High Risk Stock Alerts"
          value={warehouses.length ? highRiskCount : '—'}
          subtext={warehouses.length ? 'Requires priority dispatch' : 'No assigned facilities'}
          icon={ShieldAlert}
          color="danger"
          trend={highRiskCount > 0 ? 'Action Required' : 'Clean'}
          trendPositive={highRiskCount === 0}
        />
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/manager/capacity"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-emerald-600/40 hover:shadow-card transition-all duration-200 group flex flex-col justify-between shadow-subtle"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
              <Boxes className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-emerald-800 transition-colors">Warehouse Capacity</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Update occupancy percentage, base temperatures, and storage tariffs per MT.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
            <span>Manage Capacity</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/manager/shipments"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-sky-600/40 hover:shadow-card transition-all duration-200 group flex flex-col justify-between shadow-subtle"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-sky-100 transition-all">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-sky-800 transition-colors">Incoming Gate Receiving</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Perform gate quality inspections (bruising, ripeness, core temp) upon arrival.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform">
            <span>Inspect Inflow</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/manager/risk-monitoring"
          className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-600/40 hover:shadow-card transition-all duration-200 group flex flex-col justify-between shadow-subtle"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-amber-100 transition-all">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-900 text-base mb-1 group-hover:text-amber-800 transition-colors">Stock Risk & Dispatch</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Dispatch high-risk crop inventory to Mandi, Processing Factory, or Accelerated Market.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
            <span>Review Alerts</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Storage Facilities Summary List */}
      {warehouses.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
            <h4 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <Warehouse className="w-5 h-5 text-emerald-800" />
              <span>Managed Cold Storage Units</span>
            </h4>
            <Link to="/manager/capacity" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center">
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 space-y-3 hover:bg-stone-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-stone-900 text-sm">{w.facility_name}</h5>
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      {[w.taluk, w.district].filter(Boolean).join(', ') || 'Location unavailable'}
                    </p>
                    {w.address && <p className="text-[11px] text-stone-400 mt-0.5">{w.address}</p>}
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-xs text-emerald-800">
                    {w.occupancy_pct}% occupied
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-stone-200/70 pt-2.5 text-xs">
                  <div><span className="text-stone-400 block text-[10px] uppercase font-semibold">Capacity</span><p className="font-semibold text-stone-900">{w.capacity_mt} MT</p></div>
                  <div><span className="text-stone-400 block text-[10px] uppercase font-semibold">Base temperature</span><p className="font-semibold text-stone-900">{w.base_temp_c == null ? 'Unavailable' : `${w.base_temp_c}°C`}</p></div>
                  <div><span className="text-stone-400 block text-[10px] uppercase font-semibold">Occupied capacity</span><p className="font-semibold text-stone-900">{w.capacity_mt == null || w.occupancy_pct == null ? 'Unavailable' : `${((w.capacity_mt * w.occupancy_pct) / 100).toFixed(1)} MT`}</p></div>
                  <div><span className="text-stone-400 block text-[10px] uppercase font-semibold">Storage tariff</span><p className="font-semibold text-emerald-800">{w.price_per_ton_day == null ? 'Unavailable' : `₹${w.price_per_ton_day}/ton/day`}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {warehouses.length === 0 && !loadError && (
        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-xs">
          No facilities are assigned to this manager account. Ask an Admin to assign a facility.
        </p>
      )}
    </div>
  );
}
