import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import warehousesApi from '@/api/warehouses';
import { useAuth } from '@/hooks/useAuth';
import { Boxes, Edit2, X, CheckCircle2, Thermometer, MapPin, AlertTriangle } from 'lucide-react';

export default function WarehouseCapacity() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [simulateFault, setSimulateFault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const resp = await warehousesApi.listWarehouses();
      const whs = resp.data || [];
      setWarehouses(whs);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const isAdmin = user?.role === 'admin';
  const displayedWarehouses = warehouses;

  const openEditModal = (w) => {
    setEditingWarehouse(w);
    setFormData({
      occupancy_pct: w.occupancy_pct,
      price_per_ton_day: w.price_per_ton_day,
      base_temp_c: simulateFault ? 14.5 : w.base_temp_c,
      capacity_mt: w.capacity_mt,
      facility_id: w.facility_id,
      facility_name: w.facility_name,
      district: w.district,
      taluk: w.taluk || '',
      address: w.address || '',
      latitude: w.latitude,
      longitude: w.longitude,
      temperature_min_c: w.temperature_min_c ?? '',
      temperature_max_c: w.temperature_max_c ?? '',
      commodities_stored: w.commodities_stored || '',
      operator_type: w.operator_type || '',
      contact_phone: w.contact_phone || '',
      contact_email: w.contact_email || '',
      operational_status: w.operational_status || 'Active',
      nwrda_registered: w.nwrda_registered || 'No',
      year_established: w.year_established ?? '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        occupancy_pct: Number(formData.occupancy_pct),
        price_per_ton_day: Number(formData.price_per_ton_day),
        base_temp_c: Number(formData.base_temp_c),
        capacity_mt: Number(formData.capacity_mt),
      };
      if (isAdmin) {
        Object.assign(payload, {
          facility_id: formData.facility_id,
          facility_name: formData.facility_name,
          district: formData.district,
          taluk: formData.taluk || null,
          address: formData.address || null,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          temperature_min_c: formData.temperature_min_c === '' ? null : Number(formData.temperature_min_c),
          temperature_max_c: formData.temperature_max_c === '' ? null : Number(formData.temperature_max_c),
          commodities_stored: formData.commodities_stored || null,
          operator_type: formData.operator_type || null,
          contact_phone: formData.contact_phone || null,
          contact_email: formData.contact_email || null,
          operational_status: formData.operational_status,
          nwrda_registered: formData.nwrda_registered,
          year_established: formData.year_established === '' ? null : Number(formData.year_established),
        });
      }
      await warehousesApi.updateWarehouse(editingWarehouse.id, payload);
      setSuccessMsg(`Successfully updated ${editingWarehouse.facility_name}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setEditingWarehouse(null);
      fetchWarehouses();
    } catch (err) {
      alert('Failed to update warehouse capacity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Capacity & Setpoints"
        subtitle="Manage chamber occupancy percentages, base climate temperatures, and storage tariffs"
      />

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

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12"><LoadingState label="Fetching warehouse setpoints..." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedWarehouses.map((w) => (
            <div key={w.id} className="bg-white border border-stone-200/80 hover:border-emerald-600/40 rounded-2xl p-6 space-y-4 shadow-subtle transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 font-semibold uppercase">{w.facility_id}</span>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">{w.facility_name}</h3>
                  <p className="text-xs text-stone-500 flex items-center mt-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                    {w.district} District
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditModal(w)} title={isAdmin ? 'Edit operations and facility master details' : 'Edit permitted operational settings'}>
                  <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                </Button>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Occupancy:</span>
                  <span className="font-bold text-stone-900">{w.occupancy_pct}% ({w.capacity_mt} MT max)</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Storage Tariff:</span>
                  <span className="font-bold text-emerald-800">₹{w.price_per_ton_day} / ton / day</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Base Temperature:</span>
                  <span className={`font-bold ${simulateFault ? 'text-rose-700' : 'text-sky-800'}`}>
                    {simulateFault ? '14.5°C (FAULT)' : `${w.base_temp_c}°C`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl max-h-[90vh] w-full overflow-y-auto p-6 space-y-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="text-lg font-bold text-stone-900">Update {editingWarehouse.facility_name}</h3>
              <button onClick={() => setEditingWarehouse(null)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {isAdmin && (
                <fieldset className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <legend className="px-2 text-xs font-bold uppercase tracking-wider text-emerald-900">Admin Facility Master Details</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Facility ID" value={formData.facility_id} onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })} required />
                    <Input label="Facility Name" value={formData.facility_name} onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })} required />
                    <Input label="District" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} required />
                    <Input label="Taluk" value={formData.taluk} onChange={(e) => setFormData({ ...formData, taluk: e.target.value })} />
                    <Input label="Latitude" type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} required />
                    <Input label="Longitude" type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} required />
                    <Input label="Minimum Temperature (°C)" type="number" step="any" value={formData.temperature_min_c} onChange={(e) => setFormData({ ...formData, temperature_min_c: e.target.value })} />
                    <Input label="Maximum Temperature (°C)" type="number" step="any" value={formData.temperature_max_c} onChange={(e) => setFormData({ ...formData, temperature_max_c: e.target.value })} />
                    <Input label="Contact Phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                    <Input label="Contact Email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                    <Input label="Operator Type" value={formData.operator_type} onChange={(e) => setFormData({ ...formData, operator_type: e.target.value })} />
                    <Input label="Commodities Stored" value={formData.commodities_stored} onChange={(e) => setFormData({ ...formData, commodities_stored: e.target.value })} />
                    <Input label="Year Established" type="number" value={formData.year_established} onChange={(e) => setFormData({ ...formData, year_established: e.target.value })} />
                    <Select label="Operational Status" value={formData.operational_status} onChange={(e) => setFormData({ ...formData, operational_status: e.target.value })} options={['Active', 'Inactive', 'Maintenance'].map((value) => ({ value, label: value }))} />
                    <Select label="NWRDA Registered" value={formData.nwrda_registered} onChange={(e) => setFormData({ ...formData, nwrda_registered: e.target.value })} options={['Yes', 'No'].map((value) => ({ value, label: value }))} />
                    <div className="sm:col-span-2"><Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                  </div>
                </fieldset>
              )}

              <Input
                label="Occupancy Percentage (%)"
                type="number"
                min="0"
                max="100"
                value={formData.occupancy_pct}
                onChange={(e) => setFormData({ ...formData, occupancy_pct: e.target.value })}
                required
              />

              <Input
                label="Storage Tariff Rate (₹ / ton / day)"
                type="number"
                min="50"
                max="500"
                value={formData.price_per_ton_day}
                onChange={(e) => setFormData({ ...formData, price_per_ton_day: e.target.value })}
                required
              />

              <Input
                label="Base Temperature Setpoint (°C)"
                type="number"
                step="0.5"
                value={formData.base_temp_c}
                onChange={(e) => setFormData({ ...formData, base_temp_c: e.target.value })}
                required
              />

              <Input
                label="Storage Capacity (MT)"
                type="number"
                min="1"
                value={formData.capacity_mt}
                onChange={(e) => setFormData({ ...formData, capacity_mt: e.target.value })}
                required
              />

              <div className="pt-4 border-t border-stone-100 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setEditingWarehouse(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Save Setpoint Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
