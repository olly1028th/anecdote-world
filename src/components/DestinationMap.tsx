import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  selectedLat: number | null;
  selectedLng: number | null;
  flyTo: { lat: number; lng: number } | null;
  onSelect: (lat: number, lng: number) => void;
}

const markerIcon = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="#FF6B6B" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="11" r="3.5" fill="white"/>
    </svg>
  `,
});

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** 검색 결과로 지도를 이동시키는 컴포넌트 */
function FlyToHandler({ flyTo }: { flyTo: { lat: number; lng: number } | null }) {
  const map = useMap();
  const lastFlyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!flyTo) return;
    const key = `${flyTo.lat},${flyTo.lng}`;
    if (lastFlyRef.current === key) return;
    lastFlyRef.current = key;
    map.flyTo([flyTo.lat, flyTo.lng], 10, { duration: 1.2 });
  }, [flyTo, map]);

  return null;
}

export default function DestinationMap({ selectedLat, selectedLng, flyTo, onSelect }: Props) {
  const center: [number, number] =
    selectedLat != null && selectedLng != null
      ? [selectedLat, selectedLng]
      : [35, 127];
  const zoom = selectedLat != null ? 6 : 3;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={2}
      maxZoom={18}
      className="w-full h-full z-0"
      style={{ minHeight: '280px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onSelect={onSelect} />
      <FlyToHandler flyTo={flyTo} />
      {selectedLat != null && selectedLng != null && (
        <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />
      )}
    </MapContainer>
  );
}
