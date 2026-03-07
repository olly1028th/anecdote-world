import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { formatDate, calcDuration, totalExpenses, formatCurrency } from '../utils/format';
import type { Trip } from '../types/trip';

/** 여행 시작일 기준 정렬용 타임스탬프 */
function tripTime(trip: Trip): number {
  if (trip.startDate) return new Date(trip.startDate).getTime();
  return new Date(trip.createdAt).getTime();
}

/** D-day 계산 */
function dday(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** 상태 뱃지 */
function StatusBadge({ status }: { status: Trip['status'] }) {
  const map = {
    completed: { label: 'Visited', cls: 'bg-[#0d9488] text-white' },
    planned: { label: 'Planned', cls: 'bg-[#eab308] text-slate-900' },
    wishlist: { label: 'Wish', cls: 'bg-[#6366f1] text-white' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border-2 border-slate-900 ${cls}`}>
      {label}
    </span>
  );
}

/** D-day 카운트다운 카드 */
function UpcomingCard({ trip }: { trip: Trip }) {
  const d = dday(trip.startDate);
  const isPast = d < 0;
  return (
    <Link
      to={`/trip/${trip.id}`}
      className="shrink-0 w-36 bg-white dark:bg-slate-800 rounded-xl border-[3px] border-slate-900 retro-shadow p-3 space-y-2 no-underline snap-start"
    >
      <div className="w-full h-20 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-600">
        <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${isPast ? 'text-[#0d9488]' : d <= 7 ? 'text-[#f43f5e]' : 'text-[#f48c25]'}`}>
          {isPast ? `D+${Math.abs(d)}` : d === 0 ? 'D-DAY' : `D-${d}`}
        </span>
        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDate(trip.startDate)}</span>
      </div>
    </Link>
  );
}

/** 타임라인 여행 카드 */
function TimelineCard({ trip }: { trip: Trip }) {
  const checkDone = trip.checklist.filter((c) => c.checked).length;
  const checkTotal = trip.checklist.length;

  return (
    <div className="flex gap-3">
      {/* 타임라인 라인 + 도트 */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-4 h-4 rounded-full border-[3px] border-slate-900 shrink-0 ${
          trip.status === 'completed' ? 'bg-[#0d9488]' :
          trip.status === 'planned' ? 'bg-[#eab308]' : 'bg-[#6366f1]'
        }`} />
        <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* 카드 */}
      <Link
        to={`/trip/${trip.id}`}
        className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border-[3px] border-slate-900 retro-shadow p-4 space-y-3 no-underline mb-4 hover:border-[#f48c25] transition-colors"
      >
        {/* 헤더: 사진 + 제목 */}
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-600 shrink-0">
            <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase italic truncate">{trip.title}</p>
              <StatusBadge status={trip.status} />
            </div>
            {trip.destination && (
              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {trip.destination}
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {trip.startDate ? `${formatDate(trip.startDate)} ~ ${formatDate(trip.endDate)}` : '날짜 미정'}
              {trip.startDate && trip.endDate && ` (${calcDuration(trip.startDate, trip.endDate)})`}
            </p>
          </div>
        </div>

        {/* 미니 사진 스트립 */}
        {trip.photos.length > 0 && (
          <div className="flex gap-1.5 overflow-hidden">
            {trip.photos.slice(0, 4).map((photo, i) => (
              <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-600 shrink-0">
                <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
            {trip.photos.length > 4 && (
              <div className="w-12 h-12 rounded-lg border-2 border-slate-200 dark:border-slate-600 shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                <span className="text-[10px] font-bold text-slate-400">+{trip.photos.length - 4}</span>
              </div>
            )}
          </div>
        )}

        {/* 하단 통계 */}
        <div className="flex items-center gap-3 flex-wrap">
          {trip.expenses.length > 0 && (
            <span className="text-[10px] font-bold text-[#eab308] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" />
              </svg>
              {formatCurrency(totalExpenses(trip.expenses))}
            </span>
          )}
          {trip.places.length > 0 && (
            <span className="text-[10px] font-bold text-[#0d9488] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {trip.places.length}곳
            </span>
          )}
          {checkTotal > 0 && (
            <span className="text-[10px] font-bold text-[#f48c25] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {checkDone}/{checkTotal}
            </span>
          )}
          {trip.memo && (
            <span className="text-[10px] text-slate-400 font-medium italic truncate flex-1 min-w-0">
              "{trip.memo.length > 30 ? trip.memo.slice(0, 30) + '...' : trip.memo}"
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function TimelinePage() {
  const { trips, loading } = useTrips();

  // 다가오는 여행 (planned, 시작일 미래)
  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return trips
      .filter((t) => t.status === 'planned' && t.startDate && new Date(t.startDate).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [trips]);

  // 연도별 그룹핑 (시작일 기준 내림차순)
  const yearGroups = useMemo(() => {
    const sorted = [...trips].sort((a, b) => tripTime(b) - tripTime(a));
    const groups = new Map<number, Trip[]>();
    for (const trip of sorted) {
      const year = trip.startDate
        ? new Date(trip.startDate).getFullYear()
        : new Date(trip.createdAt).getFullYear();
      const arr = groups.get(year) ?? [];
      arr.push(trip);
      groups.set(year, arr);
    }
    return [...groups.entries()].sort(([a], [b]) => b - a);
  }, [trips]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-8 space-y-6">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold uppercase italic tracking-tight text-slate-900 dark:text-slate-100">
          Travel Log
        </h1>
        <p className="text-xs font-medium text-slate-400 mt-0.5">나의 여행 기록을 시간순으로 돌아보세요</p>
      </div>

      {/* 다가오는 여행 D-day */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#f48c25] mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Upcoming Missions
          </h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {upcoming.map((trip) => (
              <UpcomingCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {/* 여행 요약 통계 */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-[#0d9488]/10 rounded-xl border-2 border-[#0d9488]/30 p-3 text-center">
          <p className="text-2xl font-bold text-[#0d9488]">{trips.filter((t) => t.status === 'completed').length}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#0d9488]/70 mt-0.5">Visited</p>
        </div>
        <div className="bg-[#eab308]/10 rounded-xl border-2 border-[#eab308]/30 p-3 text-center">
          <p className="text-2xl font-bold text-[#eab308]">{trips.filter((t) => t.status === 'planned').length}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#eab308]/70 mt-0.5">Planned</p>
        </div>
        <div className="bg-[#6366f1]/10 rounded-xl border-2 border-[#6366f1]/30 p-3 text-center">
          <p className="text-2xl font-bold text-[#6366f1]">{trips.filter((t) => t.status === 'wishlist').length}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6366f1]/70 mt-0.5">Wishlist</p>
        </div>
      </section>

      {/* 연도별 타임라인 */}
      {yearGroups.length > 0 ? (
        <section className="space-y-6">
          {yearGroups.map(([year, yearTrips]) => (
            <div key={year}>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1 rounded-lg">
                  <span className="text-sm font-bold uppercase tracking-widest">{year}</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-bold text-slate-400">{yearTrips.length}개</span>
              </div>
              <div>
                {yearTrips.map((trip) => (
                  <TimelineCard key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">
            <svg className="w-16 h-16 mx-auto text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
          <p className="text-sm font-bold text-slate-400">아직 등록된 여행이 없습니다</p>
          <p className="text-xs text-slate-300 font-medium">+ 버튼을 눌러 첫 여행을 추가해보세요</p>
        </div>
      )}
    </div>
  );
}
