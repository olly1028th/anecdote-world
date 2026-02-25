/**
 * 스켈레톤 로딩 UI 컴포넌트
 * 다양한 형태의 로딩 플레이스홀더를 제공
 */

interface SkeletonProps {
  className?: string;
}

function Base({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />
  );
}

/** 홈페이지 전체 스켈레톤 */
export function HomePageSkeleton() {
  return (
    <div className="px-4 sm:px-6 space-y-8 pb-24">
      {/* Welcome */}
      <section className="pt-4 flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Base className="h-4 w-28" />
          <Base className="h-8 w-56" />
        </div>
        <Base className="w-11 h-11 rounded-xl shrink-0" />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center">
            <Base className="h-8 w-12 mb-1" />
            <Base className="h-3 w-16" />
          </div>
        ))}
      </section>

      {/* Map */}
      <section>
        <Base className="h-4 w-24 mb-1" />
        <Base className="h-7 w-48 mb-4" />
        <Base className="h-[260px] sm:h-[340px] rounded-xl" />
      </section>

      {/* Gallery */}
      <section>
        <Base className="h-4 w-24 mb-1" />
        <Base className="h-7 w-40 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Base key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

/** 여행 디테일 페이지 스켈레톤 */
export function TripDetailSkeleton() {
  return (
    <div className="max-w-md mx-auto px-4 pt-4 space-y-6 pb-24">
      <Base className="h-5 w-16" />

      {/* Profile header */}
      <section className="flex flex-col items-center text-center space-y-4">
        <Base className="w-32 h-32 rounded-full" />
        <div className="space-y-2 flex flex-col items-center">
          <Base className="h-7 w-48" />
          <Base className="h-4 w-32" />
          <Base className="h-3 w-40" />
        </div>
        <div className="flex gap-3 w-full">
          <Base className="flex-1 h-12 rounded-xl" />
          <Base className="w-12 h-12 rounded-xl" />
          <Base className="w-12 h-12 rounded-xl" />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
            <Base className="w-10 h-10 rounded-lg mb-2" />
            <Base className="h-3 w-16 mb-2" />
            <Base className="h-8 w-12" />
          </div>
        ))}
      </section>

      {/* Content sections */}
      {[1, 2, 3].map((i) => (
        <Base key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

/** 카드 리스트 스켈레톤 */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700">
          <Base className="w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Base className="h-4 w-3/4" />
            <Base className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Base;
