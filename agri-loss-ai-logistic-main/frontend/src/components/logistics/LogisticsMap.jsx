import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DISTRICT_COORDS } from '@/utils/constants';
import { Warehouse, Truck, MapPin, Thermometer, ShieldCheck } from 'lucide-react';

// Custom Marker Icons using SVG strings (bypasses Vite broken static asset paths)
const createCustomMarkerIcon = (color = '#10b981', isTruck = false) => {
  const svgContent = isTruck
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/></svg>`;

  return L.divIcon({
    className: 'leaflet-custom-marker-wrapper',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
        ${svgContent}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const warehouseActiveIcon = createCustomMarkerIcon('#10b981', false);
const warehouseWarningIcon = createCustomMarkerIcon('#f59e0b', false);
const warehouseFullIcon = createCustomMarkerIcon('#ef4444', false);
const shipmentIcon = createCustomMarkerIcon('#3b82f6', true);

export default function LogisticsMap({
  warehouses = [],
  shipments = [],
  center = [14.5, 75.8],
  zoom = 7,
  height = '420px',
  onSelectWarehouse,
}) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render Warehouse Markers */}
        {warehouses.map((w) => {
          let lat = w.latitude;
          let lng = w.longitude;

          // Fallback to district center coordinates if missing exact lat/lng
          if (!lat || !lng) {
            const districtCoord = DISTRICT_COORDS[w.district];
            if (districtCoord) {
              lat = districtCoord[0];
              lng = districtCoord[1];
            } else {
              return null; // Skip if no coordinate available
            }
          }

          // Choose marker icon based on occupancy
          let icon = warehouseActiveIcon;
          if (w.occupancy_pct >= 90) icon = warehouseFullIcon;
          else if (w.occupancy_pct >= 75) icon = warehouseWarningIcon;

          return (
            <Marker
              key={`wh-${w.id || w.facility_id}`}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectWarehouse && onSelectWarehouse(w),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{w.facility_id}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {w.operational_status || 'Operational'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{w.facility_name}</h4>
                  <p className="text-xs text-slate-600 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-emerald-600" />
                    {w.district} District
                  </p>

                  <div className="space-y-1 text-xs pt-1 border-t border-slate-100">
                    <div className="flex justify-between text-slate-700">
                      <span>Occupancy:</span>
                      <span className="font-semibold">{w.occupancy_pct}% ({w.capacity_mt} MT)</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Tariff:</span>
                      <span className="font-semibold text-emerald-700">₹{w.price_per_ton_day}/ton/day</span>
                    </div>
                    {w.base_temp_c && (
                      <div className="flex justify-between text-slate-700">
                        <span>Base Temp:</span>
                        <span className="font-semibold">{w.base_temp_c}°C</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Active Shipment Routes & Markers */}
        {shipments.map((s, idx) => {
          const originCoords = DISTRICT_COORDS[s.origin_district] || DISTRICT_COORDS['Mysuru'];
          const destWh = warehouses.find(
            (w) => w.facility_name === s.destination_facility || w.facility_id === s.destination_facility
          );
          const destCoords = destWh
            ? [destWh.latitude || DISTRICT_COORDS[destWh.district][0], destWh.longitude || DISTRICT_COORDS[destWh.district][1]]
            : DISTRICT_COORDS[s.destination_district] || DISTRICT_COORDS['Bengaluru Urban'];

          if (!originCoords || !destCoords) return null;

          return (
            <React.Fragment key={`shipment-${s.id || idx}`}>
              {/* Route Polyline */}
              <Polyline
                positions={[originCoords, destCoords]}
                pathOptions={{
                  color: s.status === 'in_transit' ? '#3b82f6' : '#10b981',
                  weight: 3,
                  dashArray: s.status === 'in_transit' ? '6, 8' : undefined,
                  opacity: 0.8,
                }}
              />

              {/* Shipment Marker */}
              <Marker position={originCoords} icon={shipmentIcon}>
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <span className="font-bold text-blue-700 block">Shipment #{s.id}</span>
                    <p>Crop: <strong>{s.crop_type}</strong> ({s.quantity_tons} MT)</p>
                    <p>Status: <span className="font-semibold text-blue-600 uppercase">{s.status}</span></p>
                    <p>Origin: {s.origin_district}</p>
                    <p>Destination: {s.destination_facility || s.destination_district}</p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
