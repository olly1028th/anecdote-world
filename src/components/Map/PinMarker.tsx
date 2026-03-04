import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Pin } from '../../types/database';
import { STATUS_COLORS } from '../../constants/mapConstants';

interface Props {
  pin: Pin;
  onClick?: (pin: Pin) => void;
}

const STATUS_LABELS: Record<string, string> = {
  visited: '방문',
  planned: '계획',
  wishlist: '위시',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: '맛집',
  cafe: '카페',
  landmark: '명소',
  hotel: '숙소',
  nature: '자연',
  shopping: '쇼핑',
  activity: '활동',
  other: '기타',
};

function createIcon(status: string) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.wishlist;
  return L.divIcon({
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
}

export default function PinMarker({ pin, onClick }: Props) {
  const icon = createIcon(pin.visit_status);
  const stars = pin.rating ? '★'.repeat(pin.rating) + '☆'.repeat(5 - pin.rating) : '';

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(pin),
      }}
    >
      <Popup>
        <div className="min-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: STATUS_COLORS[pin.visit_status] }}
            >
              {STATUS_LABELS[pin.visit_status]}
            </span>
            <span className="text-[10px] text-gray-400">
              {CATEGORY_LABELS[pin.category] ?? pin.category}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 m-0">{pin.name}</p>
          <p className="text-xs text-gray-500 m-0 mt-0.5">
            {pin.city}{pin.country ? `, ${pin.country}` : ''}
          </p>
          {stars && (
            <p className="text-xs text-amber-500 m-0 mt-1">{stars}</p>
          )}
          {pin.note && (
            <p className="text-xs text-gray-500 m-0 mt-1 line-clamp-2">{pin.note}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
