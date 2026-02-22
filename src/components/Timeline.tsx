import type { ItineraryItem } from '../types/trip';

interface Props {
  items: ItineraryItem[];
}

export default function Timeline({ items }: Props) {
  return (
    <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">Itinerary</h3>
        <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item.day} className="flex gap-3">
            {/* 타임라인 점 + 선 */}
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#FF6B6B] border-2 border-[#2D3436] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-[2px_2px_0px_0px_#2D3436]">
                D{item.day}
              </div>
              {idx < items.length - 1 && (
                <div className="w-1 flex-1 bg-[#2D3436]/15 my-1 rounded-full" />
              )}
            </div>
            {/* 내용 */}
            <div className="pb-4 flex-1">
              <h4 className="font-black text-sm text-[#2D3436]">{item.title}</h4>
              <p className="text-xs text-[#2D3436]/50 font-medium mt-1 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
