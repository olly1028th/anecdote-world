import type { Place } from '../types/trip';

interface Props {
  places: Place[];
  startDate?: string;
  isCompleted?: boolean;
}

const priorityConfig = {
  must: { label: '필수', bg: 'bg-[#f43f5e] text-white', border: 'border-[#f43f5e]' },
  want: { label: '가고싶음', bg: 'bg-[#eab308]', border: 'border-[#eab308]' },
  maybe: { label: '여유되면', bg: 'bg-slate-100', border: 'border-slate-300' },
} as const;

function formatDayDate(startDate: string, day: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + day - 1);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}.${d.getDate()} (${weekdays[d.getDay()]})`;
}

function PlaceCard({ place, isCompleted }: { place: Place; isCompleted?: boolean }) {
  const config = priorityConfig[place.priority];
  return (
    <div className="flex items-start gap-2.5 p-3 bg-[#F9F4E8] dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600">
      <span className="w-2 h-2 rounded-full bg-[#f48c25] mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{place.name}</span>
          {!isCompleted && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${config.border} ${config.bg}`}>
              {config.label}
            </span>
          )}
        </div>
        {place.note && (
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isCompleted && <span className="text-[#f48c25] font-bold mr-1">비고:</span>}
            {place.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PlaceList({ places, startDate, isCompleted }: Props) {
  const hasDays = places.some((p) => p.day && p.day > 0);

  if (!hasDays) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Route & Places</h3>
        <div className="space-y-2.5">
          {places.map((place, i) => (
            <PlaceCard key={i} place={place} isCompleted={isCompleted} />
          ))}
        </div>
      </div>
    );
  }

  // Group places by day
  const dayMap = new Map<number, Place[]>();
  const unassigned: Place[] = [];
  for (const place of places) {
    if (place.day && place.day > 0) {
      const arr = dayMap.get(place.day) ?? [];
      arr.push(place);
      dayMap.set(place.day, arr);
    } else {
      unassigned.push(place);
    }
  }
  const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-[3px] border-slate-900 retro-shadow">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Daily Schedule</h3>
      <div className="space-y-5">
        {sortedDays.map((day) => {
          const dayPlaces = dayMap.get(day) ?? [];
          return (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f48c25] border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">D{day}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Day {day}
                  </p>
                  {startDate && (
                    <p className="text-[10px] text-slate-400 font-medium">{formatDayDate(startDate, day)}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 ml-3 pl-3 border-l-2 border-[#f48c25]/30">
                {dayPlaces.map((place, i) => (
                  <PlaceCard key={i} place={place} isCompleted={isCompleted} />
                ))}
              </div>
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-slate-900 flex items-center justify-center">
                <span className="text-slate-600 text-[10px] font-bold">?</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">미배정</p>
            </div>
            <div className="space-y-2 ml-3 pl-3 border-l-2 border-slate-200">
              {unassigned.map((place, i) => (
                <PlaceCard key={i} place={place} isCompleted={isCompleted} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
