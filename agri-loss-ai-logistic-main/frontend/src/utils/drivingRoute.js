import { haversineKm } from './geo';
import { decodePolyline } from './polylineDecode';

/**
 * Road route via the public OSRM demo. If routing is unavailable, return no route geometry.
 * Does not use Google API keys (browser-safe).
 */
export async function fetchDrivingRoute(originLat, originLng, destLat, destLng) {
  const baseGeodist = haversineKm(originLat, originLng, destLat, destLng);
  let distKm = null;
  let polylineCoords = [];
  let routingSource = 'Road route unavailable';
  const routeDebugLog = [];

  try {
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;

    const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    if (data?.code === 'Ok' && data.routes?.[0]) {
      distKm = data.routes[0].distance / 1000.0;
      const encoded = data.routes[0].geometry;
      polylineCoords = decodePolyline(encoded);
      routingSource = 'OSRM (public demo)';
      routeDebugLog.push('OSRM: route decoded successfully.');
    } else {
      routeDebugLog.push(`OSRM returned non-OK code: ${data?.code ?? 'unknown'}`);
    }
  } catch (e) {
    routeDebugLog.push(`OSRM request failed: ${e?.name ?? 'Error'}: ${e?.message ?? e}`);
  }

  return {
    distKm,
    baseGeodist,
    polylineCoords,
    routingSource,
    routeDebugLog,
  };
}
