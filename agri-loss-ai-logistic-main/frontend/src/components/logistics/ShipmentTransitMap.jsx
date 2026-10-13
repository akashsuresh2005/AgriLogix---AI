import React, { useEffect, useState } from 'react';
import OptimalRouteMap from './OptimalRouteMap';
import LoadingState from '@/components/common/LoadingState';
import { fetchDrivingRoute } from '@/utils/drivingRoute';
import { DISTRICT_COORDS } from '@/utils/constants';
import { normalizeFacilityName } from '@/utils/warehouseOptimization';

export default function ShipmentTransitMap({
  shipment,
  warehouses,
  originDistrict,
  height = '280px',
}) {
  const [routeState, setRouteState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const district = originDistrict || shipment.origin_district;
      const origin = DISTRICT_COORDS[district];

      const destName = normalizeFacilityName(shipment.destination);
      const destWh = warehouses.find(
        (w) =>
          normalizeFacilityName(w.facility_name).toLowerCase() === destName.toLowerCase() ||
          w.facility_id === shipment.destination
      );

      if (!origin || destWh?.latitude == null || destWh?.longitude == null) {
        if (!cancelled) {
          setRouteState(null);
          setLoading(false);
        }
        return;
      }
      const destLat = destWh.latitude;
      const destLng = destWh.longitude;

      if (!destLat || !destLng) {
        setRouteState(null);
        setLoading(false);
        return;
      }

      try {
        const route = await fetchDrivingRoute(origin[0], origin[1], destLat, destLng);
        if (!cancelled) setRouteState(route);
      } catch {
        if (!cancelled) setRouteState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shipment.id, shipment.destination, shipment.origin_district, warehouses, originDistrict]);

  if (loading) {
    return (
      <div className="py-8">
        <LoadingState label="Loading transit route…" />
      </div>
    );
  }

  if (!routeState) return null;

  const district = originDistrict || shipment.origin_district;
  const origin = DISTRICT_COORDS[district];
  const destWh = warehouses.find(
    (w) =>
      normalizeFacilityName(w.facility_name).toLowerCase() ===
      normalizeFacilityName(shipment.destination).toLowerCase()
  );
  const destLat = destWh?.latitude;
  const destLng = destWh?.longitude;

  return (
    <div className="space-y-2">
      <OptimalRouteMap
        originLat={origin[0]}
        originLng={origin[1]}
        destLat={destLat}
        destLng={destLng}
        originLabel={`Origin (${district})`}
        destinationLabel={shipment.destination}
        routePoints={routeState.polylineCoords}
        height={height}
      />
      <p className="text-[11px] text-slate-500">
        Transit route source: {routeState.routingSource}
        {' · '}
        Distance: {routeState.distKm == null ? 'unavailable' : `${routeState.distKm.toFixed(1)} km`} · ETA: {shipment.eta_hours}
      </p>
    </div>
  );
}
