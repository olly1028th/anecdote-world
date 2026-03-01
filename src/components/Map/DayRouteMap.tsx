import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '../../types/trip';

interface Props {
  places: Place[];
  dayLabel?: string;
}

/** 좌표가 있는 장소만 필터링 */
function withCoords(places: Place[]) {
  return places.filter((p): p is Place & { lat: number; lng: number } => p.lat != null && p.lng != null);
}

/** 번호 마커 아이콘 */
function createNumberIcon(num: number) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#f48c25;color:#fff;border:2px solid #1c140d;
      display:flex;align-items:center;justify-content:center;
      font-weight:bold;font-size:12px;
      box-shadow:2px 2px 0 #1c140d;
    ">${num}</div>`,
  });
}

/** 지도 범위 자동 조정 */
function FitBounds({ places }: { places: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [map, places]);
  return null;
}

/** 번호 마커 레이어 */
function NumberedMarkers({ places }: { places: Array<Place & { lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    const markers: L.Marker[] = [];
    places.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], { icon: createNumberIcon(i + 1) });
      marker.bindPopup(`
        <div style="min-width:120px">
          <p style="font-weight:600;font-size:13px;margin:0">${i + 1}. ${p.name}</p>
          ${p.note ? `<p style="font-size:11px;color:#6b7280;margin:3px 0 0">${p.note}</p>` : ''}
        </div>
      `);
      marker.addTo(map);
      markers.push(marker);
    });
    return () => { markers.forEach((m) => map.removeLayer(m)); };
  }, [map, places]);
  return null;
}

export default function DayRouteMap({ places, dayLabel }: Props) {
  const geoPlaces = withCoords(places);
  if (geoPlaces.length === 0) return null;

  const positions = geoPlaces.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="mt-2 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600">
      {dayLabel && (
        <div className="bg-[#f48c25]/10 px-3 py-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#f48c25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#f48c25]">
            {dayLabel} Route ({geoPlaces.length})
          </span>
        </div>
      )}
      <MapContainer
        center={positions[0]}
        zoom={13}
        className="w-full z-0"
        style={{ height: '180px' }}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitBounds places={geoPlaces} />
        <NumberedMarkers places={geoPlaces} />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#f48c25',
              weight: 3,
              opacity: 0.8,
              dashArray: '8, 6',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
