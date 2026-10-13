import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/** Animated dashed route corridor (Streamlit AntPath-style). */
export default function AnimatedRouteLayer({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length < 2) return undefined;

    const corridor = L.polyline(positions, {
      color: '#93c5fd',
      weight: 9,
      opacity: 0.35,
      lineCap: 'round',
    }).addTo(map);

    const routeLine = L.polyline(positions, {
      color: '#3388ff',
      weight: 5,
      opacity: 0.9,
      dashArray: '10, 20',
      lineCap: 'round',
    }).addTo(map);

    let offset = 0;
    const timer = setInterval(() => {
      offset = (offset + 1) % 30;
      routeLine.setStyle({ dashOffset: String(-offset) });
    }, 50);

    return () => {
      clearInterval(timer);
      map.removeLayer(corridor);
      map.removeLayer(routeLine);
    };
  }, [map, positions]);

  return null;
}
