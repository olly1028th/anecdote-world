import type { Place } from '../types/trip';

interface Props {
  places: Place[];
}

const priorityConfig = {
  must: { label: '필수', emoji: '🔥', bg: 'bg-[#FF6B6B]', text: 'text-white' },
  want: { label: '가고싶음', emoji: '💛', bg: 'bg-[#FFD166]', text: 'text-[#2D3436]' },
  maybe: { label: '여유되면', emoji: '🤔', bg: 'bg-[#F9F4E8]', text: 'text-[#2D3436]' },
} as const;

export default function PlaceList({ places }: Props) {
  return (
    <div className="border-4 border-[#2D3436] rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_0px_#2D3436]">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-black italic uppercase tracking-tighter text-[#2D3436]">Route & Places</h3>
        <div className="h-[3px] flex-1 bg-[#2D3436]/10 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {places.map((place, i) => {
          const config = priorityConfig[place.priority];
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-[#F9F4E8] rounded-xl border-2 border-[#2D3436]/10"
            >
              {/* 순서 번호 */}
              <div className="w-7 h-7 rounded-lg bg-[#2D3436] text-white flex items-center justify-center shrink-0 text-xs font-black">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#2D3436]">{place.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 border-[#2D3436]/20 ${config.bg} ${config.text}`}
                  >
                    {config.emoji} {config.label}
                  </span>
                </div>
                {place.note && (
                  <p className="text-xs text-[#2D3436]/50 font-medium mt-1">{place.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
