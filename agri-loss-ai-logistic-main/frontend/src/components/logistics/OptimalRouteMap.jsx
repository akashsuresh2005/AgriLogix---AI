import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapFitBounds from './MapFitBounds';
import AnimatedRouteLayer from './AnimatedRouteLayer';

const truckIcon = L.divIcon({
  className: 'leaflet-custom-marker-wrapper',
  html: `
    <div style="
      background:#3388ff;width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 5px rgba(0,0,0,0.35);font-size:14px;border:2px solid #fff;
    ">🚚</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function OptimalRouteMap({
  originLat,
  originLng,
  destLat,
  destLng,
  originLabel,
  destinationLabel,
  routePoints = [],
  height = '380px',
  zoom = 10,
}) {
  const center = useMemo(
    () => [originLat, originLng],
    [originLat, originLng]
  );

  const boundsPoints = useMemo(() => {
    if (routePoints.length) return routePoints;
    return [
      [originLat, originLng],
      [destLat, destLng],
    ];
  }, [routePoints, originLat, originLng, destLat, destLng]);

  const truckPosition = useMemo(() => {
    if (!routePoints.length) {
      return [(originLat + destLat) / 2, (originLng + destLng) / 2];
    }
    const midIdx = Math.floor(routePoints.length / 2);
    return routePoints[midIdx];
  }, [routePoints, originLat, originLng, destLat, destLng]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFitBounds positions={boundsPoints} />

        <CircleMarker
          center={[originLat, originLng]}
          radius={7}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#28a745', fillOpacity: 1 }}
        />
        <Marker position={[originLat, originLng]} icon={L.divIcon({ className: '', html: `<div style="font-size:12px;font-weight:600;color:#e2e8f0;transform:translate(-10px,-28px);white-space:nowrap;">Origin</div>`, iconSize: [0, 0] })}>
          <Popup>{originLabel}</Popup>
        </Marker>

        <CircleMarker
          center={[destLat, destLng]}
          radius={7}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#dc3545', fillOpacity: 1 }}
        />
        <Marker
          position={[destLat, destLng]}
          icon={L.divIcon({
            className: '',
            html: `<div style="font-size:12px;font-weight:600;color:#e2e8f0;transform:translate(-10px,-28px);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${destinationLabel?.slice(0, 18) || 'Depot'}</div>`,
            iconSize: [0, 0],
          })}
        >
          <Popup>{destinationLabel}</Popup>
        </Marker>

        {routePoints.length > 1 && (
          <>
            <AnimatedRouteLayer positions={routePoints} />
            <Marker position={truckPosition} icon={truckIcon} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
