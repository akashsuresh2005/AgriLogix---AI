import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/badges/StatusBadge';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import LogisticsMap from '@/components/logistics/LogisticsMap';
import warehousesApi from '@/api/warehouses';
import { useLanguage } from '@/context/LanguageContext';
import { DISTRICT_LIST } from '@/utils/constants';
import { Warehouse, Search, MapPin, Thermometer, Phone, Truck, Map as MapIcon, Grid } from 'lucide-react';

export default function WarehouseFinder() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [viewMode, setViewMode] = useState('both'); // 'both', 'map', 'cards'

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await warehousesApi.listWarehouses();
        setWarehouses(resp.data || []);
      } catch (err) {
        setError(t('failed_directory'));
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  // Filter warehouses
  const filteredWarehouses = warehouses.filter((w) => {
    const matchesSearch =
      !searchTerm ||
      w.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.facility_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = !selectedDistrict || w.district === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('warehouse_finder')}
        subtitle={t('warehouse_subtitle')}
      />

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="w-full sm:w-64">
            <Input
              placeholder={t('search_facility')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              options={[
                { value: '', label: t('all_districts') },
                ...DISTRICT_LIST.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-stone-500 font-semibold whitespace-nowrap">
            {filteredWarehouses.length} {t('facilities_found')}
          </span>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${
                viewMode === 'both' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {t('view_all')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${
                viewMode === 'map' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              {t('map')}
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${
                viewMode === 'cards' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              {t('grid')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingState label={t('loading_warehouse')} />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={t('no_facilities')}
          description={t('no_search_matches')}
        />
      ) : (
        <div className="space-y-6">
          {/* Interactive Leaflet Map */}
          {(viewMode === 'both' || viewMode === 'map') && (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-3 shadow-subtle">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-bold text-stone-900 flex items-center">
                  <MapIcon className="w-4 h-4 mr-1.5 text-emerald-700" />
                  {t('gis_map')}
                </span>
                <span>{t('map_pin_help')}</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xs">
                <LogisticsMap
                  warehouses={filteredWarehouses}
                  height={viewMode === 'map' ? '560px' : '380px'}
                />
              </div>
            </div>
          )}

          {/* Warehouse Facility Cards Grid */}
          {(viewMode === 'both' || viewMode === 'cards') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWarehouses.map((w) => (
                <div
                  key={w.id}
                  className="bg-white border border-stone-200/80 hover:border-emerald-600/40 hover:shadow-card rounded-2xl p-6 flex flex-col justify-between space-y-4 transition-all duration-200 shadow-subtle"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-3">
                        <Warehouse className="w-5 h-5" />
                      </div>
                      <StatusBadge status={w.operational_status} />
                    </div>

                    <span className="text-[11px] font-mono text-stone-400 font-semibold uppercase">{w.facility_id}</span>
                    <h3 className="text-lg font-bold text-stone-900 mt-0.5">{w.facility_name}</h3>
                    <p className="text-xs text-stone-500 flex items-center mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-700 shrink-0" />
                      <span>{w.district} District</span>
                    </p>
                  </div>

                  {/* Warehouse Capacity & Pricing Meter */}
                  <div className="space-y-3 pt-4 border-t border-stone-100 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-stone-500 mb-1">
                        <span>{t('occupancy')}</span>
                        <span className="font-semibold text-stone-800">
                          {w.occupancy_pct}% ({((w.occupancy_pct * w.capacity_mt) / 100).toFixed(0)} / {w.capacity_mt} MT)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            w.occupancy_pct > 90
                              ? 'bg-rose-500'
                              : w.occupancy_pct > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${w.occupancy_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-stone-700">
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-stone-400 block text-[10px] font-semibold uppercase">{t('tariff')}</span>
                        <span className="font-bold text-emerald-800 text-xs">₹{w.price_per_ton_day}/ton/day</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        <span className="text-stone-400 block text-[10px] font-semibold uppercase">{t('base_temp')}</span>
                        <span className="font-bold text-sky-800 text-xs flex items-center">
                          <Thermometer className="w-3 h-3 mr-1 text-sky-600" />
                          {w.base_temp_c}°C
                        </span>
                      </div>
                    </div>

                    {w.contact_phone && (
                      <div className="flex items-center text-stone-500 text-xs pt-1">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                        <span>{w.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center text-xs font-semibold"
                      onClick={() => navigate(`/farmer/shipments`, { state: { targetFacility: w.facility_name } })}
                    >
                      <Truck className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
                      {t('book_storage_transit')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
