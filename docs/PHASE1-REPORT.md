# Phase 1 Completion Report

> **작업일**: 2026-03-02
> **브랜치**: `claude/review-project-structure-AkoKA`
> **빌드 상태**: tsc 통과, vite build 성공

---

## Summary

```
 Phase 1: 보안 + Critical 버그 수정
 ─────────────────────────────────────
 총 작업:   7건
 완료:      7건 (100%)
 빌드 검증: PASS
 타입 체크: PASS (에러 0건)
```

---

## 수정 내역

### SEC-1: useTrip SELECT에 user_id 필터 추가

| 항목 | 내용 |
|------|------|
| **파일** | `src/hooks/useTrips.ts:478-506` |
| **심각도** | Critical (보안) |
| **문제** | `useTrip` 단건 조회 시 `.eq('id', id)`만으로 쿼리 — RLS 비활성 환경에서 URL에 타 사용자 trip ID를 직접 입력하면 데이터 노출 |
| **수정** | 2단계 검증 패턴으로 변경: (1) `user_id` 필터로 내 여행 먼저 조회 (2) 없으면 `trip_shares` 테이블에서 공유 수락 여부 확인 후에만 여행 데이터 접근 |

**Before:**
```typescript
const { data: dbTrip } = await supabase
  .from('trips').select('*')
  .eq('id', id)          // user_id 필터 없음!
  .single();
// 이후 client-side에서 권한 검증
```

**After:**
```typescript
// 1차: 내 여행인지 확인 (user_id 필터 포함)
const { data: myTrip } = await supabase
  .from('trips').select('*')
  .eq('id', id)
  .eq('user_id', userId)  // user_id 필터 추가
  .maybeSingle();

let dbTrip = myTrip;

// 2차: 내 여행이 아니면 공유 확인 후에만 조회
if (!dbTrip) {
  const { data: share } = await supabase
    .from('trip_shares').select('id')
    .eq('trip_id', id).eq('status', 'accepted')
    .or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`)
    .maybeSingle();
  if (!share) { /* 접근 거부 */ return; }
  // 공유 확인 후 조회
  const { data: sharedTrip } = await supabase
    .from('trips').select('*').eq('id', id).single();
  dbTrip = sharedTrip;
}
```

---

### SEC-3: WorldMap 팝업 HTML 이스케이프 처리

| 항목 | 내용 |
|------|------|
| **파일** | `src/components/Map/WorldMap.tsx:87-98` |
| **심각도** | Critical (XSS) |
| **문제** | `pin.name`, `pin.note`, `pin.city`, `pin.country`, `pin.category`가 이스케이프 없이 Leaflet 팝업 HTML에 삽입. 공유 기능을 통해 타 사용자에게 스크립트 주입 가능 |
| **수정** | `escapeHtml()` 유틸 함수 추가. `& < > " '` 5종 이스케이프. 모든 사용자 입력 필드에 적용 |

**추가된 함수:**
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

---

### SEC-4: Edge Function 이메일 HTML 이스케이프

| 항목 | 내용 |
|------|------|
| **파일** | `supabase/functions/send-share-email/index.ts:59-63` |
| **심각도** | Critical (XSS + 피싱) |
| **문제** | `owner_nickname`, `trip_title`이 HTML 이스케이프 없이 이메일 본문에 삽입. `app_url`도 검증 없이 `<a href="">` 에 삽입되어 `javascript:` 피싱 URL 가능 |
| **수정** | (1) `escapeHtml()` 함수 추가 — 닉네임/제목 이스케이프 (2) `sanitizeUrl()` 함수 추가 — `http:`/`https:` 스킴만 허용, 나머지는 `#`으로 치환 |

**추가된 함수:**
```typescript
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return escapeHtml(url);
    }
  } catch { /* invalid URL */ }
  return "#";
}
```

---

### BUG-1: FitBounds에 useEffect 적용

| 항목 | 내용 |
|------|------|
| **파일** | `src/components/Map/WorldMap.tsx:25-34` |
| **심각도** | High |
| **문제** | `FitBounds` 컴포넌트가 렌더 함수 본문에서 `map.fitBounds()` 직접 호출 → 다크모드 토글, 필터 변경 등 부모 리렌더 시 사용자가 수동으로 설정한 줌/패닝이 매번 초기화 |
| **수정** | `useEffect`로 감싸서 `pins` 배열이 실제로 변경될 때만 fitBounds 실행 |

**Before:**
```typescript
function FitBounds({ pins }) {
  const map = useMap();
  if (pins.length > 0) {
    map.fitBounds(bounds);  // 매 렌더마다 실행!
  }
  return null;
}
```

**After:**
```typescript
function FitBounds({ pins }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length > 0) {
      map.fitBounds(bounds);  // pins 변경 시에만 실행
    }
  }, [map, pins]);
  return null;
}
```

---

### BUG-2: formatDate 빈 문자열 처리

| 항목 | 내용 |
|------|------|
| **파일** | `src/utils/format.ts:5-15` |
| **심각도** | Medium |
| **문제** | `formatDate('')` → `new Date('')` → Invalid Date → `"NaN.NaN.NaN"` 출력. 위시리스트 여행은 날짜 없이 생성 가능하므로 상세 페이지에서 발생 |
| **수정** | `formatDate`와 `calcDuration` 모두 빈 문자열/Invalid Date 체크 추가. 빈 입력 시 `''` 반환 |

**Before:**
```typescript
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${...}`;  // NaN.NaN.NaN
}
```

**After:**
```typescript
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${...}`;
}
```

---

### BUG-3: 404 라우트 추가

| 항목 | 내용 |
|------|------|
| **파일** | `src/App.tsx:60-85` |
| **심각도** | Medium |
| **문제** | catch-all `path="*"` 라우트 미정의 → 잘못된 URL 접근 시 빈 화면 |
| **수정** | `NotFoundPage` 인라인 컴포넌트 추가 (네오브루탈리스트 스타일). ProtectedLayout 내부 + 외부 모두 `path="*"` 라우트 설정 |

**UI 요소:**
- `"404"` 대형 타이틀 (uppercase italic tracking-tighter)
- `"페이지를 찾을 수 없습니다"` 안내 메시지
- `"홈으로 돌아가기"` CTA 버튼 (오렌지 배경, retro-shadow, 네오브루탈 테두리)
- 다크모드 대응

---

### BUG-5: 커버 이미지 빈 문자열 fallback 처리

| 항목 | 내용 |
|------|------|
| **파일** | `src/pages/TripDetailPage.tsx:488-489` |
| **심각도** | Medium |
| **문제** | `coverImage`가 빈 문자열(`""`)이면 `<img src="">` → 깨진 이미지 아이콘 표시 |
| **수정** | `trip.coverImage` 존재 여부 분기. 없으면 그라데이션 배경 + 이미지 아이콘 SVG placeholder 표시 |

**After:**
```tsx
{trip.coverImage ? (
  <img src={trip.coverImage} alt={trip.title} className="..." />
) : (
  <div className="... bg-gradient-to-br from-orange-100 to-teal-100 ...">
    <svg>/* 이미지 아이콘 */</svg>
  </div>
)}
```

---

## 변경 파일 요약

| # | 파일 | 변경 유형 |
|---|------|----------|
| 1 | `src/hooks/useTrips.ts` | 보안: user_id 필터 추가 |
| 2 | `src/components/Map/WorldMap.tsx` | 보안: XSS 방지 + 버그: useEffect |
| 3 | `supabase/functions/send-share-email/index.ts` | 보안: HTML 이스케이프 + URL 검증 |
| 4 | `src/utils/format.ts` | 버그: Invalid Date 방어 |
| 5 | `src/App.tsx` | 버그: 404 라우트 추가 |
| 6 | `src/pages/TripDetailPage.tsx` | 버그: 커버 이미지 fallback |

---

## 검증 결과

```
 항목                결과
──────────────────────────
 TypeScript 타입 체크  PASS (에러 0건)
 프로덕션 빌드        PASS (3.29s)
 번들 사이즈 변화     변경 없음 (미미한 증가)
```

---

## 다음 단계: Phase 2

```
 예상 작업량: 3-5일
 ──────────────────────────────────────────
 □ H-BE-1  delete-then-insert → upsert 패턴
 □ H-UX-1  PinFormPage 네오브루탈 스타일 적용
 □ H-UX-2  DashboardPage/ProfilePage 스타일 통일
 □ H-UX-3  다크모드 입력 필드 일관성 수정
 □ H-FE-4  검색 디바운싱 적용
 □ H-FE-5  pinFilters useMemo 적용
 □ BUG-6   렌더 본문 setState → useEffect
 □ BUG-7   비동기 fetch cancelled 플래그 추가
```
