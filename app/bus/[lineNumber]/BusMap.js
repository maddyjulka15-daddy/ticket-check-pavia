'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker } from 'react-leaflet';
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

function makeArrowIcon(angleDeg) {
  return L.divIcon({
    html: `<div style="transform: rotate(${angleDeg}deg); color: #ff453a; font-size: 22px; line-height: 1; text-shadow: 0 0 3px rgba(0,0,0,0.8); font-weight: 900;">▲</div>`,
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

export default function BusMap({ lineId }) {
  const route = routes[lineId];

  const bounds = useMemo(() => {
    if (!route) return null;
    const coords = route.coords;
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [route]);

  const arrows = useMemo(() => {
    if (!route) return [];
    const coords = route.coords;
    const fractions = [0.2, 0.5, 0.8];
    return fractions.map(f => {
      const i = Math.floor(coords.length * f);
      const next = Math.min(i + 5, coords.length - 1);
      const angle = bearing(coords[i], coords[next]);
      return { pos: coords[i], angle };
    });
  }, [route]);

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

  const startIcon = makeDotIcon('#30d158');
  const endIcon = makeDotIcon('#ff453a');
  const coords = route.coords;

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [18, 18] }}
        style={{ height: 260, width: '100%', background: '#1c1c1e' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <Polyline positions={coords} pathOptions={{ color: '#ff453a', weight: 4, opacity: 0.85 }} />
        {arrows.map((a, i) => (
          <Marker key={i} position={a.pos} icon={makeArrowIcon(a.angle)} interactive={false} />
        ))}
        <Marker position={coords[0]} icon={startIcon} />
        <Marker position={coords[coords.length - 1]} icon={endIcon} />
      </MapContainer>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: '#1c1c1e',
        fontSize: 12, color: 'rgba(235, 235, 245, 0.7)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158' }} /> {route.from || 'Start'}
        </span>
        <span style={{ color: 'rgba(235, 235, 245, 0.4)' }}>→</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {route.to || 'End'} <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff453a' }} />
        </span>
      </div>
    </div>
  );
}
