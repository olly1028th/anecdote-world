import type { Place } from '../types/trip';

interface Props {
  places: Place[];
}

const priorityConfig = {
  must: { label: '필수', className: 'bg-red-100 text-red-600' },
  want: { label: '가고 싶음', className: 'bg-blue-100 text-blue-600' },
  maybe: { label: '여유 되면', className: 'bg-gray-100 text-gray-500' },
} as const;

export default function PlaceList({ places }: Props) {
  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">추천 장소</h3>
      <div className="space-y-3">
        {places.map((place, i) => {
          const config = priorityConfig[place.priority];
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span
                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
              >
                {config.label}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{place.name}</p>
                {place.note && (
                  <p className="text-xs text-gray-400 mt-0.5">{place.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
