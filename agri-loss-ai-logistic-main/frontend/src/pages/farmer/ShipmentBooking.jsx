import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import ShipmentTransitMap from '@/components/logistics/ShipmentTransitMap';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/utils/formatters';
import { ALL_CROPS, ROAD_QUALITY_OPTIONS } from '@/utils/constants';
import { Truck, PlusCircle, X, CheckCircle2, AlertCircle, Calendar, MapPin, Clock } from 'lucide-react';

export default function ShipmentBooking() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [shipments, setShipments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Booking Form State
  const prefilledDestination = location.state?.targetFacility || 'Mysuru Regional Storage';
  const [formData, setFormData] = useState({
    booking_id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
    crop: 'Tomato',
    tonnage: 5.0,
    destination: prefilledDestination,
    route_quality: 'National Highway',
    eta_hours: '12 Hours',
    risk_status: 'LOW RISK',
    shelf_days_calculated: 5.0,
  });

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      const [shipResp, whResp] = await Promise.all([
        shipmentsApi.listShipments(),
        warehousesApi.listWarehouses(),
      ]);
      setShipments(shipResp.data || []);
      setWarehouses(whResp.data || []);
    } catch (err) {
      setError(t('failed_booking'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        booking_id: formData.booking_id,
        crop: formData.crop,
        tonnage: Number(formData.tonnage),
        destination: formData.destination,
        route_quality: formData.route_quality,
        eta_hours: formData.eta_hours,
        risk_status: formData.risk_status,
        shelf_days_calculated: Number(formData.shelf_days_calculated),
        farmer_name: user?.full_name || user?.username,
        farmer_phone: user?.phone || '9876543210',
      };

      await shipmentsApi.createShipment(payload);
      setIsModalOpen(false);
      fetchShipments();
    } catch (err) {
      const msg = err.response?.data?.detail || t('failed_booking');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transit_logistics')}
        subtitle={t('shipment_subtitle')}
        action={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5 text-emerald-200" />
            {t('book_climate_transit')}
          </Button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <LoadingState label={t('loading_bookings')} />
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={t('no_transit_bookings')}
          description={t('book_transit_help')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shipments.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-subtle hover:border-emerald-600/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 font-semibold">{s.booking_id}</span>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">{s.crop} ({s.tonnage} MT)</h3>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">{t('destination')}</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block truncate">{s.destination}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">{t('shipment_eta')}</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">{s.eta_hours}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                <RiskBadge risk={s.risk_status} />
                <span className="text-stone-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  {formatDate(s.created_at)}
                </span>
              </div>

              {(s.status === 'in_transit' || !s.status) && (
                <div className="rounded-xl overflow-hidden border border-stone-200 pt-1">
                  <ShipmentTransitMap
                    shipment={s}
                    warehouses={warehouses}
                    originDistrict={location.state?.originDistrict || user?.district}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Booking Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">{t('shipment_modal_title')}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{t('shipment_modal_subtitle')}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('booking_ref')}
                  value={formData.booking_id}
                  onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                  required
                />
                <Select
                  label={t('crop_produce')}
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                  options={ALL_CROPS.map((c) => ({ value: c, label: c }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('tonnage')}
                  type="number"
                  step="0.5"
                  value={formData.tonnage}
                  onChange={(e) => setFormData({ ...formData, tonnage: parseFloat(e.target.value) || 0 })}
                  required
                />
                <Input
                  label={t('target_destination')}
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label={t('route_quality')}
                  value={formData.route_quality}
                  onChange={(e) => setFormData({ ...formData, route_quality: e.target.value })}
                  options={ROAD_QUALITY_OPTIONS.map((r) => ({ value: r, label: r }))}
                />
                <Input
                  label={t('estimated_eta')}
                  value={formData.eta_hours}
                  onChange={(e) => setFormData({ ...formData, eta_hours: e.target.value })}
                  placeholder={t('eta_placeholder')}
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  {t('booking_confirmed')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
