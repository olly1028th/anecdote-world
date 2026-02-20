import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Pin } from '../../types/database';

interface Props {
  pin: Pin;
  onClick?: (pin: Pin) => void;
}

/** visit_status별 마커 색상 */
const STATUS_COLORS: Record<string, string> = {
  visited: '#059669',   // emerald-600
  planned: '#d97706',   // amber-600
  wishlist: '#6366f1',  // indigo-500
};

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
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="11" r="3.5" fill="white"/>
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
