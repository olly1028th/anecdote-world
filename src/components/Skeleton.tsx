/** Reusable skeleton loading primitives */

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Skeleton for a TripCard in the Space view */
export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-md shadow-gray-200/50">
      <SkeletonBox className="h-56 !rounded-none" />
      <div className="p-5 space-y-3">
        <SkeletonBox className="h-5 w-3/5" />
        <SkeletonBox className="h-4 w-2/5" />
        <div className="flex justify-between">
          <SkeletonBox className="h-4 w-1/3" />
          <SkeletonBox className="h-4 w-1/5" />
        </div>
        <div className="pt-3 border-t border-gray-100 flex justify-between">
          <SkeletonBox className="h-4 w-1/4" />
          <SkeletonBox className="h-5 w-1/4" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the home page map area */
export function MapSkeleton() {
  return (
    <div className="h-[380px] rounded-3xl overflow-hidden">
      <SkeletonBox className="w-full h-full !rounded-3xl" />
    </div>
  );
}

/** Skeleton for stats cards (dashboard) */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 flex flex-col items-center gap-2">
          <SkeletonBox className="w-8 h-8 !rounded-full" />
          <SkeletonBox className="h-7 w-12" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the home quick stats */
export function QuickStatsSkeleton() {
  return (
    <div className="bg-[#FFD166]/10 p-5 rounded-3xl border-2 border-dashed border-[#FFD166]">
      <SkeletonBox className="h-4 w-40 mb-3" />
      <div className="flex gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-3 rounded-2xl shadow-sm min-w-[100px] flex flex-col items-center gap-2">
            <SkeletonBox className="w-6 h-6 !rounded-full" />
            <SkeletonBox className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the photo gallery section */
export function PhotoGallerySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-6 w-28" />
        <div className="h-[2px] flex-1 bg-[#F0EEE6]" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shrink-0 w-[200px]">
            <div className="bg-white p-2 rounded-lg shadow-md shadow-gray-200/60 border border-gray-100">
              <SkeletonBox className="aspect-[4/3] w-full" />
              <div className="mt-2 px-1 pb-1 space-y-1">
                <SkeletonBox className="h-3 w-3/4" />
                <SkeletonBox className="h-2 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for trip detail header */
export function TripDetailHeaderSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-4 w-16" />
      <div className="rounded-3xl overflow-hidden">
        <SkeletonBox className="h-64 w-full !rounded-3xl" />
      </div>
      <div className="space-y-3">
        <SkeletonBox className="h-6 w-2/3" />
        <SkeletonBox className="h-4 w-1/3" />
      </div>
    </div>
  );
}
