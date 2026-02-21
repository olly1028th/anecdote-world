import type { ItineraryItem } from '../types/trip';

interface Props {
  items: ItineraryItem[];
}

export default function Timeline({ items }: Props) {
  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">일정</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.day} className="flex gap-4">
            {/* 타임라인 점 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {item.day}
              </div>
              {item.day < items.length && (
                <div className="w-0.5 flex-1 bg-blue-200 mt-1" />
              )}
            </div>
            {/* 내용 */}
            <div className="pb-4">
              <h4 className="font-medium text-gray-900">
                Day {item.day}: {item.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
