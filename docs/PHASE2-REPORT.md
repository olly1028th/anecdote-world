# Phase 2 Report — 안정성 & UX 일관성

## 요약

Phase 2에서는 안정성 개선(React 패턴 수정, 비동기 상태 보호)과 UX 일관성(네오브루탈리스트 스타일 통일, 다크모드 호환)을 중점으로 8건의 이슈를 해결했습니다.

| 구분 | ID | 제목 | 상태 |
|------|----|------|------|
| Bug | BUG-6 | Render-body setState → useEffect | ✅ |
| Bug | BUG-7 | 비동기 fetch cancelled 플래그 | ✅ |
| Frontend | H-FE-4 | 검색 디바운싱 적용 | ✅ |
| Frontend | H-FE-5 | pinFilters useMemo 적용 | ✅ |
| UX | H-UX-1 | PinFormPage 네오브루탈 스타일 | ✅ |
| UX | H-UX-2 | Dashboard/Profile 스타일 통일 | ✅ |
| UX | H-UX-3 | 다크모드 입력 필드 일관성 | ✅ |

## 빌드 검증

```
✅ npx tsc --noEmit — 타입 에러 없음
✅ npx vite build — 빌드 성공 (3.15s)
```

---

## 상세 변경 내역

### BUG-6: Render-body setState → useEffect

**파일**: `src/pages/TripFormPage.tsx`, `src/pages/PinFormPage.tsx`

**문제**: 편집 모드 초기화 코드가 렌더 본문에서 직접 `setState`를 호출하여 React strict mode에서 경고 발생 가능, 불필요한 re-render 유발.

**수정 전** (TripFormPage 59-73):
```tsx
if (isEdit && existing && !initialized) {
  setTitle(existing.title);
  // ...다수의 setState 호출
  setInitialized(true);
}
```

**수정 후**:
```tsx
useEffect(() => {
  if (isEdit && existing && !initialized) {
    setTitle(existing.title);
    // ...다수의 setState 호출
    setInitialized(true);
  }
}, [isEdit, existing, initialized]);
```

PinFormPage도 동일한 패턴으로 수정.

---

### BUG-7: 비동기 fetch cancelled 플래그

**파일**: `src/hooks/useTrips.ts`, `src/hooks/usePins.ts`

**문제**: 컴포넌트 언마운트 후에도 비동기 fetch 결과가 `setState`를 호출하여 React "Can't perform state update on unmounted component" 경고 발생.

**수정**: `useRef(true)`로 마운트 상태를 추적하고, 모든 비동기 state 업데이트 전에 `mountedRef.current` 체크 추가.

```tsx
const mountedRef = useRef(true);

const fetchTrips = useCallback(async () => {
  // ...
  if (!mountedRef.current) return;  // 비동기 작업 후 체크
  setTrips([...mapped, ...extraLocal]);
  // ...
  } finally {
    if (mountedRef.current) setLoading(false);
  }
}, []);

useEffect(() => {
  mountedRef.current = true;
  fetchTrips();
  return () => { mountedRef.current = false; };
}, [fetchTrips]);
```

적용 범위:
- `useTrips()`: fetchTrips 콜백 내 4곳
- `useTrip()`: refetch 콜백 내 5곳
- `usePins()`: fetchPins 콜백 내 4곳

---

### H-FE-4: 검색 디바운싱

**파일**: `src/components/SearchFilter.tsx`

**문제**: `onSearch` 콜백이 매 키스트로크마다 호출되어 불필요한 re-render 발생 (특히 여행 목록 필터링이 무거울 때).

**수정**: 250ms 디바운스 적용. 빈 값(clear 버튼)은 즉시 반영.

```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const onSearchRef = useRef(onSearch);
onSearchRef.current = onSearch;

const debouncedSearch = useCallback((value: string) => {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    onSearchRef.current(value);
  }, 250);
}, []);

const handleChange = (value: string) => {
  setQuery(value);
  if (!value) {
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch(value);  // 즉시 반영
  } else {
    debouncedSearch(value);
  }
};
```

---

### H-FE-5: pinFilters useMemo

**파일**: `src/pages/HomePage.tsx`

**문제**: `pinFilters` 배열이 매 렌더마다 재생성되며, 내부에서 `.filter()` 호출을 3번 중복 실행 (이미 계산된 `visitedPinCount` 등이 있는데도).

**수정 전**:
```tsx
const pinFilters = [
  { key: 'all', label: `전체 (${mapPins.length})` },
  { key: 'visited', label: `방문 (${mapPins.filter(p => p.visit_status === 'visited').length})` },
  // ...중복 filter 호출
];
```

**수정 후**:
```tsx
const pinFilters = useMemo(() => [
  { key: 'all', label: `전체 (${mapPins.length})` },
  { key: 'visited', label: `방문 (${visitedPinCount})` },
  { key: 'planned', label: `계획 (${plannedPinCount})` },
  { key: 'wishlist', label: `위시 (${wishlistPinCount})` },
], [mapPins.length, visitedPinCount, plannedPinCount, wishlistPinCount]);
```

---

### H-UX-1: PinFormPage 네오브루탈리스트 스타일

**파일**: `src/pages/PinFormPage.tsx`

**변경 범위**: 페이지 전체 스타일 오버홀

| 요소 | Before | After |
|------|--------|-------|
| 뒤로가기 버튼 | `text-gray-500` 일반 텍스트 | `uppercase tracking-widest` + Link 컴포넌트 |
| 제목 | `text-gray-900` 일반 | `text-[#f48c25] uppercase` 서브타이틀 + 볼드 헤딩 |
| 라벨 | `text-sm text-gray-700` | `text-xs font-bold uppercase tracking-widest text-slate-500` |
| 입력 필드 | `border border-gray-200` + `ring-blue-500` | `border-2 border-slate-900` + `ring-[#f48c25]` |
| 방문 상태 버튼 | `border border-gray-200` | `border-2 border-slate-900` + `retro-shadow` |
| 카테고리 버튼 | `bg-blue-600` 활성 | `bg-[#f48c25]` + `retro-shadow` 활성 |
| 지도 컨테이너 | `border border-gray-200` | `border-[3px] border-slate-900` + `retro-shadow` |
| 마커 아이콘 | 파란색 `#3b82f6` | 오렌지 `#f48c25` + 검정 테두리 |
| 저장 버튼 | `bg-blue-600` | `bg-[#f48c25]` + `shadow-[4px_4px]` + `active:translate` |
| 취소 버튼 | `bg-gray-100 border-0` | `border-2 border-slate-900` Link 컴포넌트 |
| 별점 색상 | `#f59e0b` | `#f48c25` |

---

### H-UX-2: DashboardPage/ProfilePage 스타일 통일

**파일**: `src/pages/DashboardPage.tsx`, `src/pages/ProfilePage.tsx`

**변경**: 모던 미니멀 스타일 → 네오브루탈리스트 통일

| Before | After |
|--------|-------|
| `rounded-3xl shadow-md shadow-gray-200/50` | `rounded-xl border-[3px] border-slate-900 dark:border-slate-100 retro-shadow` |
| `text-lg font-bold text-[#2D3436]` | `text-sm font-bold uppercase tracking-widest` |
| `text-[#2D3436]` 값 텍스트 | `text-[#1c140d]` 값 텍스트 |
| ProfilePage 수정 버튼: `bg-[#F0EEE6]` | `border-2 border-slate-900 uppercase` |
| ProfilePage 저장 버튼: `bg-[#FF6B6B]` | `bg-[#f48c25] retro-shadow active:translate` |
| ProfilePage 뒤로가기: 한국어 "뒤로" | 영문 "Back" uppercase |
| DashboardPage 헤더: `h1` + 구분선 | `Mission Stats` 서브타이틀 + 볼드 헤딩 |
| 초대 카드: `rounded-2xl shadow-md border-l-4` | `rounded-xl border-[3px] retro-shadow` |
| 공유 카드: `rounded-2xl shadow-md hover:ring` | `rounded-xl border-[3px] retro-shadow hover:border-[#f48c25]` |

---

### H-UX-3: 다크모드 입력 필드 일관성

**파일**: `src/pages/TripFormPage.tsx`, `src/components/SearchFilter.tsx`

**문제**: TripFormPage의 모든 입력 필드에 `dark:bg-*`/`dark:text-*`/`dark:border-*` 클래스가 누락되어, 다크모드에서 흰색 배경에 읽기 어려운 텍스트 표시.

**수정**:
- TripFormPage 모든 `<input>`, `<textarea>`, `<select>` 요소에 `dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100` 추가
- 상태 선택 버튼 비활성 상태에 `dark:bg-[#2a1f15]` 추가
- SearchFilter 비활성 필터 버튼에 `dark:bg-[#2a1f15] dark:text-slate-400 dark:border-slate-600` 추가
- SearchFilter 카운트 뱃지에 `dark:bg-slate-700` 추가

---

## 수정된 파일 목록

| 파일 | 변경 사유 |
|------|-----------|
| `src/pages/TripFormPage.tsx` | BUG-6, H-UX-3 |
| `src/pages/PinFormPage.tsx` | BUG-6, H-UX-1 |
| `src/hooks/useTrips.ts` | BUG-7 |
| `src/hooks/usePins.ts` | BUG-7 |
| `src/components/SearchFilter.tsx` | H-FE-4, H-UX-3 |
| `src/pages/HomePage.tsx` | H-FE-5 |
| `src/pages/DashboardPage.tsx` | H-UX-2 |
| `src/pages/ProfilePage.tsx` | H-UX-2 |
