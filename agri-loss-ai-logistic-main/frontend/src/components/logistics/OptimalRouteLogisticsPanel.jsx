import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OptimalRouteMap from './OptimalRouteMap';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import LoadingState from '@/components/common/LoadingState';
import predictionsApi from '@/api/predictions';
import shipmentsApi from '@/api/shipments';
import { getErrorMessage } from '@/api/client';
import { fetchDrivingRoute } from '@/utils/drivingRoute';
import {
  calculateOptimizedWarehouseMatrix,
  findWarehouseOption,
  normalizeFacilityName,
} from '@/utils/warehouseOptimization';
import { DISTRICT_COORDS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import { Truck, MapPin, CheckCircle2, AlertCircle, Warehouse, Route } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OptimalRouteLogisticsPanel({
  predictionResult,
  onPredictionUpdate,
  formContext,
  warehouses,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [facilityOptions, setFacilityOptions] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [routeState, setRouteState] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [bookingMode, setBookingMode] = useState('random');
  const [manualVehicleId, setManualVehicleId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [panelError, setPanelError] = useState(null);

  const originCoords = DISTRICT_COORDS[predictionResult.district];

  const buildPredictionPayload = useCallback(
    (facilityName, distKm) => ({
      crop: String(formContext.crop),
      district: String(formContext.district),
      temperature: Number(formContext.temperature),
      humidity: Number(formContext.humidity),
      road_condition: String(formContext.road_condition),
      storage_days: Number(formContext.storage_days),
      quantity_tons: Number(formContext.quantity_tons),
      actual_transit_days: Number(formContext.actual_transit_days || 3.0),
      expected_transit_days: Number(formContext.expected_transit_days || 1.5),
      arrival_volume: Number(formContext.arrival_volume || 180.0),
      avg_market_volume: Number(formContext.avg_market_volume || 90.0),
      facility_distance_km: Number(distKm),
      recommended_facility: normalizeFacilityName(facilityName),
      picture_spoilage_prob:
        formContext.picture_spoilage_prob !== null && formContext.picture_spoilage_prob !== undefined
          ? Number(formContext.picture_spoilage_prob)
          : null,
      image_data: formContext.image_data || null,
    }),
    [formContext]
  );

  const loadRouteForFacility = useCallback(
    async (option) => {
      if (!option) return;
      setRouteLoading(true);
      setPanelError(null);
      try {
        const route = await fetchDrivingRoute(
          originCoords[0],
          originCoords[1],
          option.latitude,
          option.longitude
        );
        setRouteState({
          ...route,
          target: option,
        });
      } catch (err) {
        setPanelError(getErrorMessage(err));
      } finally {
        setRouteLoading(false);
      }
    },
    [originCoords]
  );

  useEffect(() => {
    if (!predictionResult || !originCoords || !warehouses?.length) return;

    const options = calculateOptimizedWarehouseMatrix(
      originCoords[0],
      originCoords[1],
      predictionResult.crop,
      predictionResult.quantity_tons,
      predictionResult.road_condition || formContext?.road_condition || 'State Highway',
      warehouses,
      {
        recommendedFacility: predictionResult.recommended_facility,
        predictionMandiPrice: predictionResult.mandi_price_per_kg,
      }
    );

    setFacilityOptions(options);

    const initialFacility =
      findWarehouseOption(options, predictionResult.recommended_facility)?.facility_name ||
      options[0]?.facility_name ||
      '';

    setSelectedFacility(initialFacility);
  }, [predictionResult, originCoords, warehouses]);

  const activeOption = useMemo(() => {
    return findWarehouseOption(facilityOptions, selectedFacility) || facilityOptions[0];
  }, [facilityOptions, selectedFacility]);

  useEffect(() => {
    if (!activeOption) return;
    loadRouteForFacility(activeOption);
  }, [activeOption, loadRouteForFacility]);

  const displayDistKm = routeState?.distance_km ?? activeOption?.base_dist;
  const isFullFacility = (activeOption?.occupancy_pct ?? 0) >= 95.0;
  const etaHours = routeState?.duration_min != null ? (routeState.duration_min / 60).toFixed(1) : null;

  const handleFacilityChange = async (nextFacilityName) => {
    setSelectedFacility(nextFacilityName);
    const chosen = findWarehouseOption(facilityOptions, nextFacilityName);
    if (!chosen) return;

    setFacilityLoading(true);
    setPanelError(null);
    try {
      const payload = buildPredictionPayload(chosen.facility_name, chosen.base_dist);
      const resp = await predictionsApi.createPrediction(payload);
      onPredictionUpdate(resp.data);
    } catch (err) {
      setPanelError(getErrorMessage(err));
    } finally {
      setFacilityLoading(false);
    }
  };

  const handleBookShipment = async () => {
    setBookingLoading(true);
    setBookingMessage(null);
    setPanelError(null);

    const chosenOption = activeOption;
    if (!chosenOption) {
      setPanelError('Please select a destination facility before booking transit.');
      setBookingLoading(false);
      return;
    }

    const payload = {
      booking_id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      crop: predictionResult.crop,
      tonnage: Number(predictionResult.quantity_tons),
      destination: normalizeFacilityName(chosenOption.facility_name),
      route_quality: predictionResult.road_condition || 'State Highway',
      eta_hours: etaHours != null ? `${etaHours} Hours` : '12 Hours',
      risk_status: predictionResult.risk_level === 'HIGH' ? 'HIGH RISK' : 'LOW RISK',
      shelf_days_calculated: Number(predictionResult.shelf_life_days),
      farmer_name: user?.full_name || user?.username,
      farmer_phone: user?.phone || '9876543210',
      vehicle_id: bookingMode === 'manual' && manualVehicleId.trim() ? manualVehicleId.trim() : null,
    };

    try {
      const res = await shipmentsApi.createShipment(payload);
      setBookingMessage(`Shipment dispatched successfully! Booking ID: ${res.data.booking_id}`);
    } catch (err) {
      setPanelError(getErrorMessage(err));
    } finally {
      setBookingLoading(false);
    }
  };

  if (!facilityOptions.length) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-stone-200 text-sm text-stone-500 shadow-subtle">
        No cold storage routing options available for this harvest batch.
      </div>
    );
  }

  const target = routeState?.target || activeOption;
  const routingSource = routeState?.routing_source || 'calculating…';

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-subtle">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Route className="w-5 h-5 text-emerald-700" />
          Optimal Route & Logistics Corridor
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          Origin farm → recommended cold storage corridor with live road routing & market rates
        </p>
      </div>

      {(panelError || bookingMessage) && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 shadow-xs ${
            panelError
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {panelError ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <span className="font-medium">{panelError || bookingMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-2">
          {routeLoading || facilityLoading ? (
            <div className="py-24">
              <LoadingState label="Calculating optimal driving route…" />
            </div>
          ) : target ? (
            <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xs">
              <OptimalRouteMap
                originLat={originCoords[0]}
                originLng={originCoords[1]}
                destLat={target.latitude}
                destLng={target.longitude}
                originLabel={`Origin Farm (${predictionResult.district})`}
                destinationLabel={normalizeFacilityName(target.facility_name)}
                routePoints={routeState?.polylineCoords || []}
              />
            </div>
          ) : null}
          <p className="text-[11px] text-stone-400">
            Route source: <span className="font-medium text-stone-600">{routingSource}</span>
          </p>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700" />
            Optimal Node Logistics Matrix
          </h4>

          <Select
            label="Optimized Target Facility"
            value={selectedFacility}
            onChange={(e) => handleFacilityChange(e.target.value)}
            options={facilityOptions.map((o) => ({
              value: o.facility_name,
              label: o.facility_name,
            }))}
            disabled={facilityLoading}
          />

          <div className="space-y-2.5 text-sm p-4 rounded-xl bg-stone-50 border border-stone-200/80">
            <p className="text-stone-600 flex justify-between items-center">
              <span>Distance to depot:</span>
              <span className="font-semibold text-stone-900">
                {displayDistKm == null ? 'Unavailable' : `${displayDistKm.toFixed(1)} km`}
              </span>
            </p>
            <p className="text-stone-600 flex justify-between items-center">
              <span>Regional market price:</span>
              <span className="font-semibold text-emerald-800">
                {target?.mandi_price_per_kg == null ? 'Unavailable' : `₹${target.mandi_price_per_kg.toFixed(2)}/kg`}
              </span>
            </p>
            <p className="text-stone-600 flex justify-between items-center">
              <span>Capacity & Available:</span>
              <span className="font-semibold text-stone-900">
                {target?.capacity_mt == null ? '—' : `${Number(target.capacity_mt).toFixed(0)} MT`} (avail: {target?.available_capacity == null ? '—' : `${Number(target.available_capacity).toFixed(1)} MT`})
              </span>
            </p>
            <p className="text-stone-600 flex justify-between items-center">
              <span>ETA (est.):</span>
              <span className="font-semibold text-sky-800">
                {etaHours == null ? 'Unavailable' : `~${etaHours} hours`}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide block">
              Vehicle Booking Mode
            </span>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 text-stone-700 cursor-pointer text-xs font-medium">
                <input
                  type="radio"
                  name="bookingMode"
                  checked={bookingMode === 'random'}
                  onChange={() => setBookingMode('random')}
                  className="accent-emerald-700"
                />
                Auto Fleet Assignment
              </label>
              <label className="flex items-center gap-2 text-stone-700 cursor-pointer text-xs font-medium">
                <input
                  type="radio"
                  name="bookingMode"
                  checked={bookingMode === 'manual'}
                  onChange={() => setBookingMode('manual')}
                  className="accent-emerald-700"
                />
                Custom Vehicle Number
              </label>
            </div>
            {bookingMode === 'manual' && (
              <Input
                label="Vehicle Registration Number"
                placeholder="e.g. KA01AB1234"
                maxLength={10}
                value={manualVehicleId}
                onChange={(e) => setManualVehicleId(e.target.value)}
              />
            )}
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleBookShipment}
            isLoading={bookingLoading}
            disabled={isFullFacility || facilityLoading}
          >
            Book Climate-Controlled Transit
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              navigate('/farmer/shipments', {
                state: {
                  targetFacility: normalizeFacilityName(selectedFacility),
                  originDistrict: predictionResult.district,
                },
              })
            }
          >
            Open All Shipment Bookings
          </Button>
        </div>
      </div>

      <div className="border border-stone-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-700">
          Alternative Recommended Facilities in Catchment
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-stone-50/70 text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Facility</th>
                <th className="px-4 py-2 text-left font-semibold">District</th>
                <th className="px-4 py-2 text-right font-semibold">Distance</th>
                <th className="px-4 py-2 text-right font-semibold">Mandi Rate</th>
                <th className="px-4 py-2 text-right font-semibold">Est. Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {facilityOptions.map((row) => (
                <tr key={row.facility_id || row.facility_name} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-4 py-2 font-medium text-stone-900">{row.facility_name}</td>
                  <td className="px-4 py-2 text-stone-600">{row.district}</td>
                  <td className="px-4 py-2 text-right text-stone-600">{row.base_dist.toFixed(1)} km</td>
                  <td className="px-4 py-2 text-right font-medium text-emerald-800">
                    {row.mandi_price_per_kg == null ? '—' : `₹${row.mandi_price_per_kg.toFixed(2)}/kg`}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-stone-900">
                    {row.net_estimated_payout == null ? '—' : formatCurrency(row.net_estimated_payout)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
