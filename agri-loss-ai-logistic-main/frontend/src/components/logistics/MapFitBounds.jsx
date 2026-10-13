import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function MapFitBounds({ positions, padding = [40, 40] }) {
  const map = useMap();

  useEffect(() => {
    if (!positions?.length) return;
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding });
  }, [map, positions, padding]);

  return null;
}
