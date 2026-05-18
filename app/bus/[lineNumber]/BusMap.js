'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import routes from '@/lib/busRoutes.json';

function makeDotIcon(color) {
  return L.divIcon({
    html: `<div style="background:${color};border:2px solid white;width:14px;height:14px;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.6);"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function makeArrowIcon(angleDeg, color) {
  // Clean SVG chevron arrow with subtle white stroke + drop shadow for legibility.
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" style="transform: rotate(${angleDeg}deg); transform-origin: 50% 50%; overflow: visible;">
  <defs>
    <filter id="ds${Math.round(angleDeg)}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="black" flood-opacity="0.55"/>
    </filter>
  </defs>
  <path d="M11 3 L18 18 L11 14 L4 18 Z"
    fill="${color}"
    stroke="white"
    stroke-width="1.2"
    stroke-linejoin="round"
    filter="url(#ds${Math.round(angleDeg)})"/>
</svg>`.trim();
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function bearing([lat1, lon1], [lat2, lon2]) {
  const dy = lat2 - lat1;
  const dx = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180);
  const rad = Math.atan2(dx, dy);
  return (rad * 180) / Math.PI;
}

// Decide whether selected direction matches polyline direction or reverses it.
function isReversed(direction, route) {
  if (!direction || !direction.startsWith('toward-')) return false;
  const target = direction.slice('toward-'.length).toLowerCase().trim();
  const polyTo = (route.to || '').toLowerCase();
  if (!polyTo) return false;
  // If any meaningful word from the target appears in polyline's "to" station,
  // we're going forward along the polyline.
  for (const word of target.split(/\s+/)) {
    if (word.length >= 4 && polyTo.includes(word)) return false;
  }
  // Target doesn't match polyline "to" — assume it matches polyline "from", so reverse.
  return true;
}

export default function BusMap({ lineId, color = '#ef4444', direction = null }) {
  const route = routes[lineId];

  const bounds = useMemo(() => {
    if (!route) return null;
    const lats = route.coords.map(c => c[0]);
    const lngs = route.coords.map(c => c[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [route]);

  const reversed = route ? isReversed(direction, route) : false;

  const arrows = useMemo(() => {
    if (!route) return [];
    const coords = route.coords;
    const fractions = [0.3, 0.7];
    return fractions.map(f => {
      const i = Math.floor(coords.length * f);
      const next = Math.min(i + 6, coords.length - 1);
      const prev = Math.max(i - 6, 0);
      // Forward angle = direction at point i. Reverse by swapping endpoints.
      const angle = reversed ? bearing(coords[next], coords[prev]) : bearing(coords[prev], coords[next]);
      return { pos: coords[i], angle };
    });
  }, [route, reversed]);

  if (!route) {
    return (
      <div style={{
        marginTop: 12, padding: '14px 16px', background: '#1c1c1e',
        borderRadius: 14, color: 'rgba(235, 235, 245, 0.5)',
        fontSize: 13, textAlign: 'center',
      }}>
        Route map not yet available for this line.
      </div>
    );
  }

  // Pick start/end based on the user's chosen direction.
  const coords = route.coords;
  const startPos = reversed ? coords[coords.length - 1] : coords[0];
  const endPos = reversed ? coords[0] : coords[coords.length - 1];
  const startIcon = makeDotIcon('#30d158');
  const endIcon = makeDotIcon('#ff453a');

  // Caption text mirrors the chosen direction.
  const captionFrom = reversed ? (route.to || 'Start') : (route.from || 'Start');
  const captionTo = reversed ? (route.from || 'End') : (route.to || 'End');

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [18, 18] }}
        style={{ height: 260, width: '100%', background: '#e8e8e8' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <Polyline positions={coords} pathOptions={{ color, weight: 5, opacity: 0.9 }} />
        {arrows.map((a, i) => (
          <Marker key={i} position={a.pos} icon={makeArrowIcon(a.angle, color)} interactive={false} />
        ))}
        <Marker position={startPos} icon={startIcon} />
        <Marker position={endPos} icon={endIcon} />
      </MapContainer>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: '#1c1c1e',
        fontSize: 12, color: 'rgba(235, 235, 245, 0.7)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158' }} /> {captionFrom}
        </span>
        <span style={{ color: 'rgba(235, 235, 245, 0.4)' }}>→</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {captionTo} <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff453a' }} />
        </span>
      </div>
    </div>
  );
}
