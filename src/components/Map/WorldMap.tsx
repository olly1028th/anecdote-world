import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { Pin } from '../../types/database';
import PinMarker from './PinMarker';

interface Props {
  pins: Pin[];
  onPinClick?: (pin: Pin) => void;
}

/** visit_status별 마커 색상 */
const STATUS_COLORS: Record<string, string> = {
  visited: '#059669',
  planned: '#d97706',
  wishlist: '#6366f1',
};

/** 핀들의 좌표로 지도 범위를 자동 조정 */
function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();

  if (pins.length > 0) {
    const bounds: LatLngBoundsExpression = pins.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }

  return null;
}

/** 마커 클러스터링 레이어 */
function ClusterLayer({ pins, onPinClick }: { pins: Pin[]; onPinClick?: (pin: Pin) => void }) {
  const map = useMap();

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 42 : 48;
        return L.divIcon({
          html: `<div style="
            width: ${size}px; height: ${size}px;
            background: #f48c25; color: white;
            border: 3px solid #1c140d;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 12px;
            box-shadow: 2px 2px 0 #1c140d;
          ">${count}</div>`,
          className: '',
          iconSize: L.point(size, size),
        });
      },
    });

    for (const pin of pins) {
      const color = STATUS_COLORS[pin.visit_status] ?? STATUS_COLORS.wishlist;
      const icon = L.divIcon({
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
        html: `
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="9" fill="${color}" stroke="#1c140d" stroke-width="2"/>
            <ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="${color}" stroke-width="2" opacity="0.7" transform="rotate(-20 16 16)"/>
            <circle cx="13" cy="13" r="2" fill="white" opacity="0.5"/>
          </svg>
        `,
      });

      const marker = L.marker([pin.lat, pin.lng], { icon });

      // 팝업
      const statusLabels: Record<string, string> = { visited: '방문', planned: '계획', wishlist: '위시' };
      const catLabels: Record<string, string> = { food: '맛집', cafe: '카페', landmark: '명소', hotel: '숙소', nature: '자연', shopping: '쇼핑', activity: '활동', other: '기타' };
      const stars = pin.rating ? '★'.repeat(pin.rating) + '☆'.repeat(5 - pin.rating) : '';

      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:10px;padding:2px 6px;border-radius:9999px;color:white;background:${color}">${statusLabels[pin.visit_status] || ''}</span>
            <span style="font-size:10px;color:#9ca3af">${catLabels[pin.category] || pin.category}</span>
          </div>
          <p style="font-weight:600;font-size:14px;margin:0">${pin.name}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0">${pin.city}${pin.country ? ', ' + pin.country : ''}</p>
          ${stars ? `<p style="font-size:12px;color:#d97706;margin:4px 0 0">${stars}</p>` : ''}
          ${pin.note ? `<p style="font-size:12px;color:#6b7280;margin:4px 0 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${pin.note}</p>` : ''}
        </div>
      `);

      if (onPinClick) {
        marker.on('click', () => onPinClick(pin));
      }

      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, pins, onPinClick]);

  return null;
}

export default function WorldMap({ pins, onPinClick }: Props) {
  const useCluster = pins.length > 15;

  return (
    <MapContainer
      center={[35, 127]}
      zoom={3}
      minZoom={2}
      maxZoom={18}
      className="w-full h-full rounded-xl z-0"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds pins={pins} />
      {useCluster ? (
        <ClusterLayer pins={pins} onPinClick={onPinClick} />
      ) : (
        pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} onClick={onPinClick} />
        ))
      )}
    </MapContainer>
  );
}
