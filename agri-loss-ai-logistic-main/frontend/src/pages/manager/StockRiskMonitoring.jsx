import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/badges/StatusBadge';
import RiskBadge from '@/components/badges/RiskBadge';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import shipmentsApi from '@/api/shipments';
import warehousesApi from '@/api/warehouses';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Send, X, AlertCircle, Shield } from 'lucide-react';

export default function StockRiskMonitoring() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedAdminWarehouseId, setSelectedAdminWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dispatch Modal State
  const [dispatchingShipment, setDispatchingShipment] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [actionType, setActionType] = useState('mandi');
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [shipResp, whResp] = await Promise.all([
        shipmentsApi.listShipments(),
        warehousesApi.listWarehouses(),
      ]);
      setShipments(shipResp.data || []);
      const whs = whResp.data || [];
      setWarehouses(whs);
      if (whs.length > 0) {
        setSelectedWarehouseId(whs[0].id.toString());
        setSelectedAdminWarehouseId(whs[0].id.toString());
      }
    } catch (err) {
      setError('Failed to fetch stored inventory telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      alert('Please select a warehouse facility.');
      return;
    }
    try {
      setSubmitting(true);
      await warehousesApi.dispatchShipment(
        Number(selectedWarehouseId),
        dispatchingShipment.id,
        actionType,
        vehicleRegNo || null
      );
      setDispatchingShipment(null);
      fetchData();
    } catch (err) {
      alert('Failed to dispatch shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Risk Monitoring & Priority Dispatch"
        subtitle="Continuous shelf-life degradation tracking and market/factory dispatch triggers"
      />

      {/* Admin Warehouse Selector Bar */}
      {isAdmin && warehouses.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
          <span className="text-xs font-bold text-amber-800 flex items-center uppercase tracking-wider">
            <Shield className="w-4 h-4 mr-2 text-amber-600" />
            Admin Facility Selector
          </span>
          <div className="w-full sm:w-80">
            <Select
              value={selectedAdminWarehouseId}
              onChange={(e) => setSelectedAdminWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({
                value: w.id.toString(),
                label: `${w.facility_name} (${w.district})`,
              }))}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12"><LoadingState label="Monitoring inventory shelf-life parameters..." /></div>
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Stored Produce Inventory"
          description="There are currently no active crop batches in warehouse storage."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shipments.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200/80 hover:border-emerald-600/30 rounded-2xl p-6 space-y-4 shadow-subtle transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 font-semibold">{s.booking_id}</span>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">{s.crop} ({s.tonnage} MT)</h3>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">Remaining Shelf Life</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{s.shelf_days_calculated.toFixed(1)} Days</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">Destination Facility</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block truncate">{s.destination}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                <RiskBadge risk={s.risk_status} />
                <Button variant="outline" size="sm" onClick={() => setDispatchingShipment(s)}>
                  <Send className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Trigger Dispatch
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchingShipment && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Trigger Stock Dispatch</h3>
                <p className="text-xs text-stone-500 mt-0.5">Batch: {dispatchingShipment.booking_id} ({dispatchingShipment.crop})</p>
              </div>
              <button onClick={() => setDispatchingShipment(null)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4">
              <Select
                label="Dispatch Origin Warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: w.facility_name }))}
                required
              />

              <Select
                label="Dispatch Action Channel"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                options={[
                  { value: 'mandi', label: 'Standard Mandi Market Sale' },
                  { value: 'accelerated', label: 'Accelerated Price-Discount Clearance' },
                  { value: 'factory', label: 'Processing Factory Direct Transfer (ITC / Kisan Foods)' },
                  { value: 'redirected', label: 'Secondary Cold Storage Reroute' },
                ]}
              />

              <Input
                label="Dispatch Transport Vehicle Reg No (Optional)"
                placeholder="e.g. KA-09-EA-4521"
                value={vehicleRegNo}
                onChange={(e) => setVehicleRegNo(e.target.value)}
              />

              <div className="pt-4 border-t border-stone-100 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setDispatchingShipment(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Confirm Dispatch Trigger
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
