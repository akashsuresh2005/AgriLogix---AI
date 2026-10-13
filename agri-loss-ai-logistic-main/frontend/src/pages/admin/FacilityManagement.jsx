import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import warehousesApi from '@/api/warehouses';
import { DISTRICT_LIST } from '@/utils/constants';
import {
  Warehouse,
  Search,
  Filter,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Boxes,
  Thermometer,
  Phone,
  Mail,
  ShieldCheck,
  RefreshCw,
  Building,
} from 'lucide-react';

export default function FacilityManagement() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal states
  const [inspectingFacility, setInspectingFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await warehousesApi.listWarehouses();
      setFacilities(response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load cold storage facilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        f.facility_name.toLowerCase().includes(q) ||
        f.facility_id.toLowerCase().includes(q) ||
        f.district.toLowerCase().includes(q) ||
        (f.taluk && f.taluk.toLowerCase().includes(q)) ||
        (f.commodities_stored && f.commodities_stored.toLowerCase().includes(q));

      const matchesDistrict = !selectedDistrict || f.district.toLowerCase() === selectedDistrict.toLowerCase();
      const matchesStatus = !selectedStatus || f.operational_status === selectedStatus;

      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [facilities, searchQuery, selectedDistrict, selectedStatus]);

  const openInspectModal = (facility) => {
    setInspectingFacility(facility);
  };

  const openEditModal = (facility) => {
    setEditingFacility(facility);
    setFormErrors({});
    setEditForm({
      facility_name: facility.facility_name || '',
      district: facility.district || '',
      taluk: facility.taluk || '',
      address: facility.address || '',
      capacity_mt: facility.capacity_mt ?? '',
      occupancy_pct: facility.occupancy_pct ?? 0,
      price_per_ton_day: facility.price_per_ton_day ?? 180,
      base_temp_c: facility.base_temp_c ?? 4.0,
      temperature_min_c: facility.temperature_min_c ?? '',
      temperature_max_c: facility.temperature_max_c ?? '',
      operational_status: facility.operational_status || 'Active',
      operator_type: facility.operator_type || 'Private',
      commodities_stored: facility.commodities_stored || '',
      contact_phone: facility.contact_phone || '',
      contact_email: facility.contact_email || '',
      nwrda_registered: facility.nwrda_registered || 'No',
      year_established: facility.year_established ?? '',
    });
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.facility_name.trim()) {
      errors.facility_name = 'Facility name is required';
    }
    if (!editForm.district) {
      errors.district = 'District is required';
    }

    const capacityNum = Number(editForm.capacity_mt);
    if (editForm.capacity_mt === '' || isNaN(capacityNum) || capacityNum < 1 || !Number.isInteger(capacityNum)) {
      errors.capacity_mt = 'Capacity must be a positive whole integer (at least 1 MT)';
    }

    if (editForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.contact_email)) {
      errors.contact_email = 'Invalid email address format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveFacility = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    try {
      setSaving(true);
      setError('');
      const payload = {
        facility_name: editForm.facility_name.trim(),
        district: editForm.district,
        taluk: editForm.taluk?.trim() || null,
        address: editForm.address?.trim() || null,
        capacity_mt: parseInt(editForm.capacity_mt, 10),
        occupancy_pct: Number(editForm.occupancy_pct) || 0,
        price_per_ton_day: Number(editForm.price_per_ton_day) || 180,
        base_temp_c: Number(editForm.base_temp_c) || 4.0,
        temperature_min_c: editForm.temperature_min_c !== '' && editForm.temperature_min_c !== null ? Number(editForm.temperature_min_c) : null,
        temperature_max_c: editForm.temperature_max_c !== '' && editForm.temperature_max_c !== null ? Number(editForm.temperature_max_c) : null,
        operational_status: editForm.operational_status,
        operator_type: editForm.operator_type?.trim() || null,
        commodities_stored: editForm.commodities_stored?.trim() || null,
        contact_phone: editForm.contact_phone?.trim() || null,
        contact_email: editForm.contact_email?.trim() || null,
        nwrda_registered: editForm.nwrda_registered || 'No',
        year_established: editForm.year_established !== '' && editForm.year_established !== null ? parseInt(editForm.year_established, 10) : null,
      };

      const response = await warehousesApi.updateWarehouse(editingFacility.id, payload);
      const updated = response.data;

      // Update state with saved server response
      setFacilities((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSuccessMsg(`Successfully saved updates for ${updated.facility_name} (Capacity: ${updated.capacity_mt} MT).`);
      setEditingFacility(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update facility details.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const totalCapacity = useMemo(() => {
    return facilities.reduce((sum, f) => sum + (f.capacity_mt || 0), 0);
  }, [facilities]);

  const activeCount = useMemo(() => {
    return facilities.filter((f) => f.operational_status === 'Active').length;
  }, [facilities]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Management"
        subtitle="Administer registered cold storage facilities, inspect facility records, and update warehouse storage capacity"
      />

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-forest-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5e9df] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Total Registered Hubs</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{facilities.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{activeCount} Currently Active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-200 text-forest-700 flex items-center justify-center">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#e5e9df] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-700">State Storage Capacity</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalCapacity.toLocaleString()} <span className="text-sm font-semibold text-slate-600">MT</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Across Karnataka districts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#e5e9df] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest-700">Coverage Network</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{new Set(facilities.map((f) => f.district)).size} <span className="text-sm font-semibold text-slate-600">Districts</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Connected to logistics transit</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e5e9df] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search facility name, ID, taluk, or commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 border border-stone-300 hover:border-stone-400 rounded-xl text-sm bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-600/20 focus:border-forest-700 shadow-xs transition-colors"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3.5 py-2.5 border border-stone-300 hover:border-stone-400 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-forest-600/20 focus:border-forest-700 shadow-xs cursor-pointer"
            >
              <option value="">All Districts ({DISTRICT_LIST.length})</option>
              {DISTRICT_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-2.5 border border-stone-300 hover:border-stone-400 rounded-xl text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-forest-600/20 focus:border-forest-700 shadow-xs cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>

            <Button
              variant="secondary"
              onClick={fetchFacilities}
              className="flex items-center gap-1.5"
              title="Refresh facility list"
            >
              <RefreshCw className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span>
            Showing <strong className="text-stone-800">{filteredFacilities.length}</strong> of{' '}
            <strong className="text-stone-800">{facilities.length}</strong> facilities
          </span>
          {(searchQuery || selectedDistrict || selectedStatus) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDistrict('');
                setSelectedStatus('');
              }}
              className="text-forest-700 hover:underline font-semibold"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Facilities Table */}
      {loading ? (
        <div className="py-16">
          <LoadingState label="Loading registered storage facilities..." />
        </div>
      ) : filteredFacilities.length === 0 ? (
        <EmptyState
          title="No facilities found"
          description="Try broadening your search criteria or resetting the district filter."
        />
      ) : (
        <div className="bg-white border border-[#e5e9df] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-800">
              <thead className="bg-[#f8f9f6] text-[11px] font-bold uppercase tracking-wider text-stone-600 border-b border-[#e5e9df]">
                <tr>
                  <th className="py-3.5 px-4">Facility & Code</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-right">Capacity (MT)</th>
                  <th className="py-3.5 px-4 text-center">Occupancy</th>
                  <th className="py-3.5 px-4">Tariff / Temp</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e9df]">
                {filteredFacilities.map((facility) => {
                  const statusColors = {
                    Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    Maintenance: 'bg-amber-50 text-amber-800 border-amber-200',
                    Inactive: 'bg-rose-50 text-rose-800 border-rose-200',
                  }[facility.operational_status] || 'bg-stone-50 text-stone-700 border-stone-200';

                  return (
                    <tr key={facility.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{facility.facility_name}</div>
                        <div className="text-xs font-mono text-stone-500">{facility.facility_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center text-xs font-semibold text-stone-800">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-forest-600 shrink-0" />
                          {facility.district}
                        </div>
                        {facility.taluk && (
                          <div className="text-xs text-stone-500 pl-4">{facility.taluk}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {facility.capacity_mt.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-stone-500">MT</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-stone-700">
                          <span>{facility.occupancy_pct}%</span>
                          <div className="w-12 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                            <div
                              className={`h-full rounded-full ${
                                facility.occupancy_pct > 85
                                  ? 'bg-rose-500'
                                  : facility.occupancy_pct > 60
                                  ? 'bg-amber-500'
                                  : 'bg-forest-600'
                              }`}
                              style={{ width: `${Math.min(100, facility.occupancy_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-stone-800">₹{facility.price_per_ton_day}/ton/day</div>
                        <div className="text-stone-500 flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-sky-600" />
                          <span>{facility.base_temp_c}°C</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors}`}>
                          {facility.operational_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openInspectModal(facility)}
                            className="p-1.5 text-stone-600 hover:text-forest-700 hover:bg-forest-50 rounded-lg transition-colors"
                            title="Inspect facility details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(facility)}
                            className="p-1.5 text-forest-700 hover:text-forest-900 hover:bg-forest-50 rounded-lg transition-colors font-medium flex items-center gap-1 text-xs px-2.5 py-1 border border-forest-200"
                            title="Edit details and capacity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Facility Modal */}
      {inspectingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#f8f9f6]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {inspectingFacility.facility_name}
                  </h3>
                  <span className="text-xs font-mono text-stone-500">ID: {inspectingFacility.facility_id}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectingFacility(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-forest-50/50 border border-forest-100 rounded-xl p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-forest-800">Storage Capacity</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {inspectingFacility.capacity_mt.toLocaleString()} MT
                  </p>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Current Occupancy</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {inspectingFacility.occupancy_pct}%
                  </p>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Tariff</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    ₹{inspectingFacility.price_per_ton_day}/t/d
                  </p>
                </div>
              </div>

              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 p-3 bg-stone-50/50">
                  <span className="font-semibold text-stone-600">District & Taluk</span>
                  <span className="col-span-2 text-stone-900 font-medium">
                    {inspectingFacility.district} {inspectingFacility.taluk ? `— Taluk: ${inspectingFacility.taluk}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-semibold text-stone-600">Address</span>
                  <span className="col-span-2 text-stone-900">{inspectingFacility.address || 'Not specified'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-stone-50/50">
                  <span className="font-semibold text-stone-600">Operational Status</span>
                  <span className="col-span-2 font-bold text-stone-900">{inspectingFacility.operational_status}</span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-semibold text-stone-600">Operator Type</span>
                  <span className="col-span-2 text-stone-900">{inspectingFacility.operator_type || 'Commercial / Private'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-stone-50/50">
                  <span className="font-semibold text-stone-600">Temperature Setpoints</span>
                  <span className="col-span-2 text-stone-900">
                    Base: {inspectingFacility.base_temp_c}°C · Range: {inspectingFacility.temperature_min_c ?? 'N/A'}°C to {inspectingFacility.temperature_max_c ?? 'N/A'}°C
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-semibold text-stone-600">Supported Commodities</span>
                  <span className="col-span-2 text-stone-900">{inspectingFacility.commodities_stored || 'Multi-commodity'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-stone-50/50">
                  <span className="font-semibold text-stone-600">Contact Details</span>
                  <span className="col-span-2 text-stone-900">
                    {inspectingFacility.contact_phone && <span>📞 {inspectingFacility.contact_phone} </span>}
                    {inspectingFacility.contact_email && <span>✉️ {inspectingFacility.contact_email}</span>}
                    {!inspectingFacility.contact_phone && !inspectingFacility.contact_email && 'No contact info recorded'}
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <span className="font-semibold text-stone-600">NWRDA Registered</span>
                  <span className="col-span-2 text-stone-900">{inspectingFacility.nwrda_registered || 'No'}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => {
                  const f = inspectingFacility;
                  setInspectingFacility(null);
                  openEditModal(f);
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit This Facility</span>
              </Button>
              <Button variant="primary" onClick={() => setInspectingFacility(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Facility & Capacity Modal */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#f8f9f6]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Edit Facility: {editingFacility.facility_name}
                  </h3>
                  <span className="text-xs font-mono text-stone-500">ID: {editingFacility.facility_id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingFacility(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Facility Name"
                  required
                  value={editForm.facility_name}
                  onChange={(e) => setEditForm({ ...editForm, facility_name: e.target.value })}
                  error={formErrors.facility_name}
                  placeholder="e.g. Hassan Cold Storage Hub"
                />

                <Select
                  label="District"
                  required
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                  options={DISTRICT_LIST}
                  error={formErrors.district}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Taluk / Sub-district"
                  value={editForm.taluk}
                  onChange={(e) => setEditForm({ ...editForm, taluk: e.target.value })}
                  placeholder="e.g. Channarayapatna"
                />

                {/* Storage Capacity with strict client-side validation */}
                <div className="relative">
                  <Input
                    label="Storage Capacity (Metric Tons)"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.capacity_mt}
                    onChange={(e) => setEditForm({ ...editForm, capacity_mt: e.target.value })}
                    error={formErrors.capacity_mt}
                    helperText="Total warehouse storage capacity in MT"
                  />
                  <span className="absolute right-3.5 top-9 text-xs font-bold text-stone-400 pointer-events-none">
                    MT
                  </span>
                </div>
              </div>

              <Input
                label="Physical Address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Industrial Area, Survey No..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Operational Status"
                  value={editForm.operational_status}
                  onChange={(e) => setEditForm({ ...editForm, operational_status: e.target.value })}
                  options={['Active', 'Maintenance', 'Inactive']}
                />

                <Input
                  label="Operator Type"
                  value={editForm.operator_type}
                  onChange={(e) => setEditForm({ ...editForm, operator_type: e.target.value })}
                  placeholder="Private / APMC / Govt"
                />

                <Select
                  label="NWRDA Registered"
                  value={editForm.nwrda_registered}
                  onChange={(e) => setEditForm({ ...editForm, nwrda_registered: e.target.value })}
                  options={['Yes', 'No']}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Base Temp (°C)"
                  type="number"
                  step="0.5"
                  value={editForm.base_temp_c}
                  onChange={(e) => setEditForm({ ...editForm, base_temp_c: e.target.value })}
                />
                <Input
                  label="Min Temp (°C)"
                  type="number"
                  step="0.5"
                  value={editForm.temperature_min_c}
                  onChange={(e) => setEditForm({ ...editForm, temperature_min_c: e.target.value })}
                />
                <Input
                  label="Max Temp (°C)"
                  type="number"
                  step="0.5"
                  value={editForm.temperature_max_c}
                  onChange={(e) => setEditForm({ ...editForm, temperature_max_c: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Phone"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                  placeholder="e.g. 080-23456789"
                />
                <Input
                  label="Contact Email"
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                  error={formErrors.contact_email}
                  placeholder="manager@coldstorage.in"
                />
              </div>

              <Input
                label="Stored Commodities"
                value={editForm.commodities_stored}
                onChange={(e) => setEditForm({ ...editForm, commodities_stored: e.target.value })}
                placeholder="e.g. Potato, Tomato, Onion, Fruits"
              />

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setEditingFacility(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  className="px-6"
                >
                  Save Facility Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
