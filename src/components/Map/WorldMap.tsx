import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Pin } from '../../types/database';
import PinMarker from './PinMarker';

interface Props {
  pins: Pin[];
  onPinClick?: (pin: Pin) => void;
}

/** 핀들의 좌표로 지도 범위를 자동 조정 */
function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();

  if (pins.length > 0) {
    const bounds: LatLngBoundsExpression = pins.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }

  return null;
}

export default function WorldMap({ pins, onPinClick }: Props) {
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} onClick={onPinClick} />
      ))}
    </MapContainer>
  );
}
