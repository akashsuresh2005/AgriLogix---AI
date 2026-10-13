import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import MetricCard from '@/components/cards/MetricCard';
import LoadingState from '@/components/common/LoadingState';
import LogisticsMap from '@/components/logistics/LogisticsMap';
import warehousesApi from '@/api/warehouses';
import shipmentsApi from '@/api/shipments';
import adminApi from '@/api/admin';
import apiClient from '@/api/client';
import { Users, Activity, Cpu, ShieldCheck, Warehouse, Truck, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  const [warehouses, setWarehouses] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', database: 'checking' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [whResp, shipResp, usersResp, healthResp] = await Promise.all([
          warehousesApi.listWarehouses().catch(() => ({ data: [] })),
          shipmentsApi.listShipments().catch(() => ({ data: [] })),
          adminApi.listUsers().catch(() => ({ data: [] })),
          apiClient.get('/api/health').catch(() => ({ data: { status: 'degraded', database: 'unreachable' } })),
        ]);
        setWarehouses(whResp.data || []);
        setShipments(shipResp.data || []);
        setUserCount((usersResp.data || []).length);
        setHealthStatus(healthResp.data || { status: 'healthy', database: 'healthy' });
      } catch (e) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalCapacity = warehouses.reduce((acc, w) => acc + (w.capacity_mt || 0), 0);

  if (loading) {
    return <div className="py-12"><LoadingState label="Loading Admin Telemetry..." /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin System Control Center"
        subtitle="Network Infrastructure Telemetry, Facility Distribution, and API Diagnostics"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Registered Facilities"
          value={warehouses.length}
          subtext={`Total ${totalCapacity.toLocaleString()} MT Capacity`}
          icon={Warehouse}
        />
        <MetricCard
          title="Total Managed Shipments"
          value={shipments.length}
          subtext="Active & stored batches"
          icon={Truck}
        />
        <MetricCard
          title="Registered Users"
          value={userCount}
          subtext="Farmers, Managers & Admins"
          icon={Users}
        />
        <MetricCard
          title="System & Database Health"
          value={healthStatus.status === 'healthy' ? 'Healthy' : 'Degraded'}
          subtext={`DB: ${healthStatus.database === 'healthy' ? 'Connected' : healthStatus.database}`}
          icon={Activity}
          trendPositive={healthStatus.status === 'healthy'}
        />
      </div>

      {/* State-Wide Logistics Network Map */}
      <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 border-b border-[#e5e9df] pb-3 gap-2">
          <span className="font-bold text-slate-900 flex items-center text-sm">
            <MapPin className="w-4 h-4 mr-2 text-forest-600" />
            Karnataka Logistics & Storage Infrastructure Network
          </span>
          <span className="font-medium bg-forest-50 text-forest-700 px-2.5 py-1 rounded-full border border-forest-200/60 inline-flex items-center">
            {warehouses.length} Cold Storage Facilities • {shipments.length} Active Shipments
          </span>
        </div>
        <div className="rounded-xl overflow-hidden border border-[#e5e9df]">
          <LogisticsMap
            warehouses={warehouses}
            shipments={shipments}
            height="380px"
          />
        </div>
      </div>

      {/* Admin Module Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Link
          to="/admin/facilities"
          className="p-6 rounded-2xl bg-white border border-[#e5e9df] hover:border-forest-500/50 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Warehouse className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-forest-700 transition-colors">Facility Management</h4>
          <p className="text-xs text-slate-500 leading-relaxed">View registered facilities, inspect details, and update storage capacity.</p>
        </Link>
        <Link
          to="/admin/users"
          className="p-6 rounded-2xl bg-white border border-[#e5e9df] hover:border-forest-500/50 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-purple-700 transition-colors">User Management</h4>
          <p className="text-xs text-slate-500 leading-relaxed">View and manage user account roles (Farmer, Warehouse Manager, Admin).</p>
        </Link>

        <Link
          to="/admin/system-health"
          className="p-6 rounded-2xl bg-white border border-[#e5e9df] hover:border-forest-500/50 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-forest-700 transition-colors">System Health</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Inspect backend health check status, response latency, and database connectivity.</p>
        </Link>

        <Link
          to="/admin/model-performance"
          className="p-6 rounded-2xl bg-white border border-[#e5e9df] hover:border-forest-500/50 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-blue-700 transition-colors">Model Performance</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Telemetry status for scikit-learn 1.9.1 GradientBoosting ML artifacts.</p>
        </Link>
      </div>
    </div>
  );
}
