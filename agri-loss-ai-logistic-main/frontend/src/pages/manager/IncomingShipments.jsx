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
import { Truck, CheckCircle2, X, AlertCircle, Shield } from 'lucide-react';

export default function IncomingShipments() {
  const { user } = useAuth();
  const [activeShipments, setActiveShipments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedAdminWarehouseId, setSelectedAdminWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inspection Modal State
  const [inspectingShipment, setInspectingShipment] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [formData, setFormData] = useState({
    bruising: 'None',
    ripeness: 'Optimal Balance',
    core_temp: 10.0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [shipResp, whResp] = await Promise.all([
        shipmentsApi.listActiveShipments(),
        warehousesApi.listWarehouses(),
      ]);
      setActiveShipments(shipResp.data || []);
      const whs = whResp.data || [];
      setWarehouses(whs);
      if (whs.length > 0) {
        setSelectedWarehouseId(whs[0].id.toString());
        setSelectedAdminWarehouseId(whs[0].id.toString());
      }
    } catch (err) {
      setError('Failed to fetch active incoming shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin';

  const handleInspect = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      alert('Please select a target receiving warehouse facility.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        shipment_booking_id: inspectingShipment.booking_id,
        bruising: formData.bruising,
        ripeness: formData.ripeness,
        core_temp: Number(formData.core_temp),
      };

      await warehousesApi.inspectArrival(Number(selectedWarehouseId), payload);
      setInspectingShipment(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Gate inspection failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Gate Receiving Inspections"
        subtitle="Accept arriving crop transit batches, record pulp temperature, bruising, and ripeness"
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
        <div className="py-12"><LoadingState label="Fetching gate arrival queue..." /></div>
      ) : activeShipments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Arriving Shipments"
          description="There are currently no active in-transit shipments awaiting gate check-in."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeShipments.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200/80 hover:border-emerald-600/30 rounded-2xl p-6 space-y-4 shadow-subtle transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 font-semibold">{s.booking_id}</span>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">{s.crop} ({s.tonnage} MT)</h3>
                  <p className="text-xs text-stone-500 mt-1">Farmer: <span className="text-stone-800 font-medium">{s.farmer_name || 'Registered Producer'}</span></p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                <RiskBadge risk={s.risk_status} />
                <Button variant="primary" size="sm" onClick={() => setInspectingShipment(s)}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Perform Gate Inspection
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gate Inspection Modal */}
      {inspectingShipment && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Gate Receiving Inspection</h3>
                <p className="text-xs text-stone-500 mt-0.5">Batch Ref: {inspectingShipment.booking_id} ({inspectingShipment.crop})</p>
              </div>
              <button onClick={() => setInspectingShipment(null)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInspect} className="space-y-4">
              <Select
                label="Receiving Storage Facility"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: `${w.facility_name} (${w.district})` }))}
                required
              />

              <Select
                label="Physical Bruising Assessment"
                value={formData.bruising}
                onChange={(e) => setFormData({ ...formData, bruising: e.target.value })}
                options={[
                  { value: 'None', label: 'None (Intact Skin)' },
                  { value: 'Slight', label: 'Slight (Minor Blemishes)' },
                  { value: 'Severe', label: 'Severe (Cracked / Bruised)' },
                ]}
              />

              <Select
                label="Crop Ripeness Stage"
                value={formData.ripeness}
                onChange={(e) => setFormData({ ...formData, ripeness: e.target.value })}
                options={[
                  { value: 'Unripe', label: 'Unripe (Firm / Green)' },
                  { value: 'Optimal Balance', label: 'Optimal Balance (Ready for Storage)' },
                  { value: 'Overripe / Soft', label: 'Overripe / Soft (Immediate Action)' },
                ]}
              />

              <Input
                label="Core Produce Temperature (°C)"
                type="number"
                step="0.5"
                min="0"
                max="40"
                value={formData.core_temp}
                onChange={(e) => setFormData({ ...formData, core_temp: parseFloat(e.target.value) || 0 })}
                helperText="Pulp temperature probe reading at entry gate"
                required
              />

              <div className="pt-4 border-t border-stone-100 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setInspectingShipment(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Complete Inspection & Store
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
