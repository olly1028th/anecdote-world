import { useStats } from '../hooks/useStats';
import { formatCurrency, expenseCategoryLabel } from '../utils/format';

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  flight: 'bg-sky-500',
  hotel: 'bg-violet-500',
  food: 'bg-orange-500',
  transport: 'bg-green-500',
  activity: 'bg-pink-500',
  shopping: 'bg-rose-500',
  other: 'bg-gray-400',
};

export default function DashboardPage() {
  const stats = useStats();

  // 로딩 상태
  if (stats.loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-gray-400">통계를 불러오는 중...</div>
      </div>
    );
  }

  const maxExpense = Math.max(...stats.expenseByCategory.map((e) => e.amount), 1);
  const maxPinCategory = Math.max(...stats.pinsByCategory.map((p) => p.count), 1);
  const totalPins =
    stats.pinsByStatus.visited + stats.pinsByStatus.planned + stats.pinsByStatus.wishlist;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 페이지 헤더 */}
      <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
      <p className="text-gray-500 mt-1 mb-8">나의 여행 통계를 한눈에 확인하세요.</p>

      {/* ── 1. 히어로 통계 카드 ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard value={stats.completedCount} label="다녀온 여행" color="text-emerald-600" />
        <StatCard value={stats.plannedCount} label="계획 중" color="text-amber-500" />
        <StatCard value={stats.countriesVisited.length} label="방문 국가" color="text-blue-600" />
        <StatCard value={stats.citiesVisited.length} label="방문 도시" color="text-indigo-500" />
      </section>

      {/* ── 2. 지출 분석 섹션 ── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">지출 분석</h2>

        {/* 총 지출 / 평균 지출 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">총 지출</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">여행당 평균</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(Math.round(stats.avgExpensePerTrip))}
            </p>
          </div>
        </div>

        {/* 카테고리별 가로 막대 차트 */}
        {stats.expenseByCategory.length > 0 ? (
          <div className="space-y-3">
            {stats.expenseByCategory
              .slice()
              .sort((a, b) => b.amount - a.amount)
              .map((item) => {
                const widthPercent = (item.amount / maxExpense) * 100;
                const barColor = EXPENSE_CATEGORY_COLORS[item.category] || 'bg-gray-400';

                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">
                        {expenseCategoryLabel(item.category)}
                      </span>
                      <span className="text-gray-500">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`${barColor} h-3 rounded-full transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">지출 기록이 없습니다.</p>
        )}
      </section>

      {/* ── 3. 핀 통계 섹션 ── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">핀 통계</h2>

        {/* 핀 상태 요약 */}
        <div className="flex items-center gap-6 mb-6">
          <PinStatusDot
            color="bg-emerald-600"
            label="방문"
            count={stats.pinsByStatus.visited}
            total={totalPins}
          />
          <PinStatusDot
            color="bg-amber-500"
            label="계획"
            count={stats.pinsByStatus.planned}
            total={totalPins}
          />
          <PinStatusDot
            color="bg-indigo-500"
            label="위시리스트"
            count={stats.pinsByStatus.wishlist}
            total={totalPins}
          />
        </div>

        {/* 방문 국가 뱃지 */}
        {stats.countriesVisited.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">방문한 국가</h3>
            <div className="flex flex-wrap gap-2">
              {stats.countriesVisited.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                >
                  {country}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 핀 카테고리 미니 바 차트 */}
        {stats.pinsByCategory.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">카테고리별 핀</h3>
            <div className="space-y-2">
              {stats.pinsByCategory
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((item) => {
                  const widthPercent = (item.count / maxPinCategory) * 100;

                  return (
                    <div key={item.category} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20 shrink-0 truncate">
                        {item.category}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-indigo-400 h-2 rounded-full transition-all"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {totalPins === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">핀이 아직 없습니다.</p>
        )}
      </section>

      {/* ── 4. 활동 요약 섹션 ── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">활동 요약</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* 사진 수 */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-pink-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</p>
              <p className="text-sm text-gray-500">총 사진</p>
            </div>
          </div>

          {/* 체크리스트 진행률 */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              {stats.checklistProgress.total > 0 ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.checklistProgress.checked}
                    <span className="text-base font-normal text-gray-400">
                      {' '}
                      / {stats.checklistProgress.total}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">체크리스트 완료</p>
                  {/* 프로그레스 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(stats.checklistProgress.checked / stats.checklistProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-300">-</p>
                  <p className="text-sm text-gray-400">체크리스트 없음</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── 내부 컴포넌트 ──

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function PinStatusDot({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color} inline-block`} />
      <span className="text-sm text-gray-700">
        {label}{' '}
        <span className="font-semibold">{count}</span>
        {total > 0 && (
          <span className="text-gray-400 ml-1 text-xs">
            ({Math.round((count / total) * 100)}%)
          </span>
        )}
      </span>
    </div>
  );
}
