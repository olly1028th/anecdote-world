# Anecdote World — 5인 전문가 팀 종합 검토 보고서

> 검토일: 2026-03-04
> 대상 버전: `66bcbae` (claude/review-project-structure-3rmKA)

---

## 목차

1. [팀 구성 및 검토 범위](#팀-구성-및-검토-범위)
2. [에이전트 1: 프론트엔드 아키텍트](#에이전트-1-프론트엔드-아키텍트)
3. [에이전트 2: 백엔드/데이터 엔지니어](#에이전트-2-백엔드데이터-엔지니어)
4. [에이전트 3: UI/UX & 접근성 전문가](#에이전트-3-uiux--접근성-전문가)
5. [에이전트 4: 보안 & 성능 전문가](#에이전트-4-보안--성능-전문가)
6. [에이전트 5: DevOps/DX 엔지니어](#에이전트-5-devopsdx-엔지니어)
7. [교차 분석 종합 요약](#교차-분석-종합-요약)
8. [우선순위 액션 플랜](#우선순위-액션-플랜)

---

## 팀 구성 및 검토 범위

| # | 역할 | 검토 대상 | 발견 사항 |
|---|------|----------|----------|
| 1 | **프론트엔드 아키텍트** | 컴포넌트 구조, React 패턴, 코드 스플리팅, 성능 | 🔴5 🟡11 🟢10 |
| 2 | **백엔드/데이터 엔지니어** | Supabase 통합, 데이터 흐름, 보안, 일관성 | 🔴4 🟡12 🟢7 |
| 3 | **UI/UX & 접근성 전문가** | 디자인 시스템, a11y, 반응형, 다크모드 | 🔴7 🟡13 🟢10 |
| 4 | **보안 & 성능 전문가** | XSS, 인증, CSP, 번들 최적화, API 보안 | 🔴4 🟡11 🟢3 |
| 5 | **DevOps/DX 엔지니어** | 빌드 설정, 테스트, CI/CD, 코드 품질 | 🔴5 🟡18 🟢12 |

---

## 에이전트 1: 프론트엔드 아키텍트

### 🔴 Critical Issues

#### F-C1. TripDetailPage.tsx — God Component (1,285줄)

**파일**: `src/pages/TripDetailPage.tsx`

단일 페이지 컴포넌트가 다음을 모두 처리:
- 인라인 사진 편집 (`editingPhotos`, `draftPhotos`, `draftCover`, `savePhotosInline`)
- 인라인 경비 편집 (`editingExpenses`, `draftExpenses`, CRUD 핸들러)
- 인라인 체크리스트 편집 (`editingChecklist`, `draftChecklist`, CRUD 핸들러)
- 인라인 장소/일정 편집 (`editingPlaces`, `draftPlaces`, 장소 검색 모달 상태)
- 인라인 메모 편집 (`editingMemo`, `draftMemo`)
- 공유 모달 UI 전체 (`shareModalOpen`, `inviteEmail`, `invitePermission`, `inviting`)
- ConfirmModal 상태 관리
- 상태 전환 로직 (`cycleStatus`)
- PDF 내보내기
- 사진 캡션 편집

**라인 143~157**: 동시에 10개의 state 선언:

```typescript
const [editingPhotos, setEditingPhotos] = useState(false);
const [editingExpenses, setEditingExpenses] = useState(false);
const [editingChecklist, setEditingChecklist] = useState(false);
const [editingPlaces, setEditingPlaces] = useState(false);
const [editingMemo, setEditingMemo] = useState(false);
const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
const [draftCover, setDraftCover] = useState('');
const [draftExpenses, setDraftExpenses] = useState<Expense[]>([]);
const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);
const [draftPlaces, setDraftPlaces] = useState<Place[]>([]);
```

**권장 분리**:
- `TripExpenseSection` (편집 포함)
- `TripChecklistSection`
- `TripPlacesSection`
- `TripPhotoSection`
- `TripShareModal`
- `TripMemoSection`

---

#### F-C2. useStats()가 useTrips()/usePins() 중복 호출 — N+1 패턴

**파일**: `src/hooks/useStats.ts` (라인 50-51)

```typescript
const { trips, loading: tripsLoading } = useTrips();
const { pins, loading: pinsLoading } = usePins();
```

`useStats`는 내부에서 `useTrips()`와 `usePins()`를 독립적으로 호출한다. `DashboardPage`, `ProfilePage`에서도 `useStats()`가 호출되어 **동일 사용자에 대해 Supabase 쿼리를 또다시 실행한다** (각 훅이 자체 fetch 로직을 가짐). 훅 인스턴스가 서로 공유되지 않으므로 같은 탭에서 두 컴포넌트가 마운트되면 중복 네트워크 요청이 발생한다.

**근본 원인**: React Context나 캐싱 레이어 없이 훅이 독립적으로 fetch를 수행하기 때문.

---

#### F-C3. mutation 함수들이 매번 `supabase.auth.getUser()` 개별 호출

**파일**: `src/hooks/useTrips.ts`

라인 312, 326, 347, 360, 424, 485, 545 — 각 mutation 함수(`createTrip`, `updateTrip`, `deleteTrip`, `saveExpenses`, `saveChecklistItems`, `savePlaces`, `toggleChecklistItem`)가 독립적으로 `supabase.auth.getUser()`를 호출:

```typescript
export async function createTrip(input: TripInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();  // 라인 312
  ...
}
export async function updateTrip(id: string, input: Partial<TripInput>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();  // 라인 326
  ...
}
```

사용 측(`TripDetailPage.tsx`)에서 이미 `useAuth()`로 user를 보유하고 있음에도 각 함수가 별도 네트워크 요청으로 사용자를 재확인한다.

---

#### F-C4. `photo_captions` 필드가 DB 타입 정의에 없음

**파일**: `src/types/database.ts`의 `Trip` 인터페이스 (라인 21-32)에 `photo_captions` 필드 없음

**파일**: `src/hooks/useTrips.ts` (라인 95):

```typescript
const dbCaptions = (db as unknown as Record<string, unknown>).photo_captions as Record<string, string> | undefined;
```

타입 캐스팅을 두 번 중첩(`as unknown as Record<string, unknown>`)으로 우회. DB 스키마가 실제로 `photo_captions` 컬럼을 가지면 `Trip` 인터페이스에 추가해야 하고, 없으면 이 코드가 항상 `undefined`를 반환하므로 로직이 불필요.

---

#### F-C5. HomePage.tsx — 공유 모달이 페이지에 직접 내장 (743줄)

**파일**: `src/pages/HomePage.tsx`

라인 39~51에 공유 모달 state, 라인 628~730에 모달 JSX가 직접 포함. `TripDetailPage`에도 유사한 코드가 존재하며, 별도 `ShareModal` 컴포넌트로 분리해야 한다.

---

### 🟡 Improvements Needed

#### F-I1. `completedTrips` 등 useMemo 미적용

**파일**: `src/pages/HomePage.tsx` (라인 122-124):

```typescript
const completedTrips = trips.filter((t) => t.status === 'completed');
const plannedTrips = trips.filter((t) => t.status === 'planned');
const wishlistTrips = trips.filter((t) => t.status === 'wishlist');
```

`useMemo` 없이 선언되어 모달 열림/닫힘, 검색 입력 등 **모든** 상태 변경마다 trips 배열을 3번 순회. `displayTrips`와 `pinFilters`는 `useMemo`로 감싸져 있는데 이것들만 빠져 있어 일관성 없음.

---

#### F-I2. `WorldMap.tsx`와 `PinMarker.tsx`에 상수 중복 정의

**파일**: `src/components/Map/WorldMap.tsx` (라인 28-32), `src/components/Map/PinMarker.tsx` (라인 11-15)

`STATUS_COLORS`가 두 파일에 동일하게 정의. `ClusterLayer`가 직접 생성하는 팝업 안의 인라인 `statusLabels`, `catLabels`도 `PinMarker`의 상수와 중복. `src/constants/mapConstants.ts`로 추출 필요.

---

#### F-I3. PinFormPage에서 전체 데이터를 로드하여 단건 검색

**파일**: `src/pages/PinFormPage.tsx` (라인 56-59):

```typescript
const { pins } = usePins();
const { trips } = useTrips();
const existing = isEdit ? pins.find((p) => p.id === id) : undefined;
```

편집 모드에서 단일 핀을 찾기 위해 **전체 핀 목록**과 **전체 여행 목록**을 가져옴. `usePin(id)` 단건 조회 훅이 적절.

---

#### F-I4. Leaflet이 Map 디렉토리 밖 3개 컴포넌트에서 직접 import

**파일**: `DestinationMap.tsx`, `PlaceSearchModal.tsx`, `PinFormPage.tsx`

`src/components/Map/` 디렉토리가 Leaflet 추상화 레이어로 설계되었음에도 3개 파일이 Leaflet을 직접 사용. Vite 코드 스플리팅 관점에서도 Leaflet(`~200KB gzipped`)이 lazy loading 없이 포함됨.

---

#### F-I5. ClusterLayer의 useEffect 내에서 매 렌더마다 모든 마커 재생성

**파일**: `src/components/Map/WorldMap.tsx` (라인 52-129)

`pins` 배열 레퍼런스가 바뀔 때마다 기존 클러스터를 완전히 제거하고 재생성. 핀 수가 많을 때 성능 문제 발생.

---

#### F-I6. 라우트에서 Suspense가 개별 라우트마다 중복 선언

**파일**: `src/App.tsx` (라인 85-99)

```typescript
<Route path="/dashboard" element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
<Route path="/profile" element={<Suspense fallback={<Loading />}><ProfilePage /></Suspense>} />
// ... 반복
```

`ProtectedLayout`을 감싸는 단일 Suspense 경계로 대체 가능.

---

#### F-I7. `index`를 React `key`로 사용하는 곳 다수

**파일**: `PlaceList.tsx` (라인 63, 108, 135), `ExpenseTable.tsx` (라인 67), `PhotoGallery.tsx` (라인 68, 190), `TripDetailPage.tsx` (라인 1122, 1199), `TripFormPage.tsx` (라인 546, 605)

편집 모드에서 항목 추가/삭제 시 key가 index 기반이면 React가 DOM을 잘못 재사용.

---

#### F-I8. ConfirmModal 상태 타입이 3개 페이지에서 동일하게 중복 정의

**파일**: `TripDetailPage.tsx` (라인 82-89), `HomePage.tsx` (라인 44-51), `ProfilePage.tsx` (라인 41-48)

```typescript
const [confirmModal, setConfirmModal] = useState<{
  open: boolean; title: string; message: string;
  confirmLabel?: string; danger?: boolean;
  onConfirm: () => void;
}>({ open: false, title: '', message: '', onConfirm: () => {} });
```

`useConfirmModal()` 커스텀 훅으로 추출 필요.

---

#### F-I9. `invitations` 데이터를 Header와 HomePage가 각각 독립적으로 fetch

**파일**: `Header.tsx` (라인 12), `HomePage.tsx` (라인 36)

같은 사용자 이메일로 `usePendingInvitations`를 독립적으로 호출 → 동일 Supabase 쿼리 2번 실행.

---

#### F-I10. `PlaceSearchModal.tsx`의 useEffect에서 eslint-disable로 의존성 배열 우회

**파일**: `src/components/PlaceSearchModal.tsx` (라인 86)

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

`searchPlaces` 함수가 의존성 배열에서 제외. stale closure 가능성.

---

#### F-I11. `useTrips` 훅이 747줄 단일 파일에 모든 mutation 포함

**파일**: `src/hooks/useTrips.ts`

분리 권장: `useTrips.ts` (조회), `tripMutations.ts` (create/update/delete), `useTrip.ts` (단건), `tripSubMutations.ts` (expenses, checklist, places)

---

### 🟢 Good Practices

1. **코드 스플리팅 + lazy loading** — 7개 페이지 + WorldMap 모두 `React.lazy` (`App.tsx:10-16`)
2. **Race condition 방지** — `fetchIdRef` + `mountedRef` 이중 안전장치 (`useTrips.ts:137-154`)
3. **병렬 Supabase 쿼리** — `Promise.all`로 N+1 방지 (`useTrips.ts:204-216`)
4. **visibilitychange + 30초 쓰로틀** — 크로스 디바이스 동기화 (`useTrips.ts:281-291`)
5. **Tombstone 삭제 패턴** — trips/pins 모두 적용 (`localStore.ts`)
6. **XSS 방지** — `escapeHtml` 함수 (`WorldMap.tsx:12-20`)
7. **`import type` 일관적 사용** — 런타임 번들에 타입 코드 미포함
8. **`mapDbTripToUi` 단일 변환 함수** — snake_case→camelCase 진입점 통일
9. **ErrorBoundary 최상위 배치** (`main.tsx`)
10. **SearchFilter debounce** — `useRef` + 250ms + clear on unmount (`SearchFilter.tsx:21-29`)

---

## 에이전트 2: 백엔드/데이터 엔지니어

### 🔴 Critical Issues

#### D-C1. `useSharesForTrip` — 소유자 검증 없이 전체 공유 목록 노출

**파일**: `src/hooks/useShares.ts`, 라인 58-62

```typescript
const { data, error } = await supabase
  .from('trip_shares')
  .select('*')
  .eq('trip_id', tripId)
  .order('created_at', { ascending: false });
```

`owner_id` 또는 현재 사용자 ID 필터 없음. RLS 미활성화 시 어떤 사용자도 임의 `tripId`의 모든 초대 이메일 목록(개인정보)을 열람 가능.

**수정**: `.eq('owner_id', userId)` 조건 추가.

---

#### D-C2. `revokeAllShares` — 현재 사용자 검증 없음

**파일**: `src/hooks/useShares.ts`, 라인 717-738

```typescript
export async function revokeAllShares(ownerId: string, invitedEmail: string): Promise<void> {
  const { error } = await supabase
    .from('trip_shares')
    .delete()
    .eq('owner_id', ownerId)       // ← ownerId는 파라미터로 외부에서 전달
    .eq('invited_email', invitedEmail);
```

함수 내부에서 `supabase.auth.getUser()`를 호출하지 않음. 다른 mutation 함수(`removeShare`, `updateSharePermission`)는 모두 내부에서 인증 검증을 수행하는데, 이 함수만 예외.

---

#### D-C3. 공유받은 여행의 하위 데이터에 user_id 필터 없음

**파일**: `src/hooks/useTrips.ts`, 라인 204-215

```typescript
const [expensesRes, checklistRes, pinsRes] = await Promise.all([
  supabase.from('expenses').select('*').in('trip_id', tripIds),
  supabase.from('checklist_items').select('*').in('trip_id', tripIds).order('sort_order'),
  supabase.from('pins').select('*').in('trip_id', tripIds).order('sort_order'),
]);
```

`tripIds`에 자신의 여행과 공유받은 타인의 여행 ID가 모두 포함. `user_id` 필터 없음. CLAUDE.md: "모든 SELECT 쿼리는 반드시 `user_id` 필터 필요"라고 명시되어 있으나 이 쿼리들은 미준수.

---

#### D-C4. `deleteTrip` — 관련 핀이 로컬에 남는 데이터 고아 문제

**파일**: `src/hooks/useTrips.ts`, 라인 346-352

```typescript
export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  // ❌ deleteLocalTrip(id) 호출 없음!
}
```

DB 여행 삭제 시 `deleteLocalTrip(id)` 미호출. 다음 `fetchTrips()` 시 `extraLocal`에 포함되어 삭제된 여행이 부활 가능. `isDemo` 경로(라인 243)에서는 `deleteDemoTrip(id)`를 올바르게 호출.

---

### 🟡 Improvements Needed

#### D-I1. `createShare` / `shareAllTrips` — ownerId 파라미터 신뢰 문제

**파일**: `src/hooks/useShares.ts`, 라인 317-378 / 586-660

`ownerId`를 파라미터로 받아 `owner_id` 컬럼에 삽입. 현재 로그인 사용자 ID와 일치 검증 없음. RLS 없이는 타인 명의로 공유 초대 발송 가능.

---

#### D-I2. Promise.all 개별 에러 무시

**파일**: `src/hooks/useTrips.ts`, 라인 218-220

```typescript
const allExpenses: DbExpense[] = expensesRes.data ?? [];
const allChecklist: DbChecklistItem[] = checklistRes.data ?? [];
```

`expensesRes.error`, `checklistRes.error`, `pinsRes.error`를 개별 확인하지 않음. 부분 실패 시 빈 배열로 조용히 처리 → 사용자 입장에서 데이터 유실처럼 보임.

---

#### D-I3. N+1 업데이트 루프

**파일**: `src/hooks/useTrips.ts`, 라인 407-415

```typescript
for (const e of existingItems) {
  const { error: updErr } = await supabase
    .from('expenses')
    .update({ category: e.category, amount: e.amount, label: e.label })
    .eq('id', e.id!)
    .eq('user_id', userId);
  if (updErr) throw updErr;
}
```

`saveChecklistItems`(467-475)도 동일 패턴. N개 항목 = N번 순차적 DB 왕복. Supabase `upsert`로 1회 요청 대체 가능.

---

#### D-I4. `syncLocal.ts` — 락 기반 동시성 제어의 취약성

**파일**: `src/lib/syncLocal.ts`, 라인 18-20

```typescript
const lock = localStorage.getItem(SYNC_LOCK_KEY);
if (lock && Date.now() - Number(lock) < 30_000) return;
localStorage.setItem(SYNC_LOCK_KEY, String(Date.now()));
```

`localStorage` 기반 락은 같은 탭 내에서만 유효. 멀티 탭 환경에서 `getItem`과 `setItem` 사이 경쟁 조건 발생 가능.

---

#### D-I5. 공유받은 핀 범위가 여행 단위보다 넓음

**파일**: `src/hooks/usePins.ts`, 라인 63-70

공유 여행의 모든 핀을 `user_id` 필터 없이 조회. D-C3과 동일 맥락.

---

#### D-I6. `useFavoritePhotos` — pin_photos에 user_id 직접 필터 불가

**파일**: `src/hooks/useFavoritePhotos.ts`, 라인 83-87

`.eq('pins.user_id', userId)`는 PostgREST 임베디드 필터이지 `pin_photos` 테이블 직접 필터가 아님. RLS 없이는 다른 사용자의 `pin_photos`도 읽힘 가능.

---

#### D-I7. `useTrip` 단건 — 미로그인 fallback 시 error 상태 미초기화

**파일**: `src/hooks/useTrips.ts`, 라인 591-601

`refetch()` 재호출 시 이전 에러 상태가 유지될 수 있음.

---

#### D-I8. `allPinPhotos` 미필터링 전달

**파일**: `src/hooks/useTrips.ts`, 라인 240

```typescript
allPinPhotos,  // ← 모든 여행의 전체 pin_photos를 전달
```

내부에서 `pinIdSet`으로 필터하지만, 불필요한 데이터를 함수 인자로 넘기는 설계 문제. 단건 조회에서는 올바르게 처리됨(684-692).

---

#### D-I9. localStorage 저장소 크기 무제한 성장

**파일**: `src/lib/localStore.ts`

`deletedTripIds`와 `deletedPinIds` Set은 한 번 추가되면 영원히 누적. 정리 로직 없음.

---

#### D-I10. `leaveShare` 데모 모드 — 하드코딩된 user ID

**파일**: `src/hooks/useShares.ts`, 라인 522

```typescript
const { data: { user } } = { data: { user: { id: 'demo-user-001', email: '' } } };
```

`supabase.auth.getUser()` 호출 구조를 흉내 낸 가짜 객체. 극도로 혼란스러운 패턴.

---

#### D-I11. `useSharesForTrip` — visibilitychange 리스너 없음

**파일**: `src/hooks/useShares.ts`, 라인 40-83

`useTrips`/`usePins`와 달리 탭 전환 시 자동 갱신 없음.

---

#### D-I12. syncLocal.ts — 동기화 후 trip_id 변경 시 핀 중복 가능성

**파일**: `src/lib/syncLocal.ts`, 라인 189-191

`removeLocalPin()`은 `deleteLocalPin()`과 달리 tombstone 미생성. trip_id가 변경된 경우 중복 발생 가능.

---

### 🟢 Good Practices

1. **Race condition 방지** — `fetchIdRef` 패턴 (`useTrips.ts:137-154`, `usePins.ts:16-35`)
2. **mutation user_id 이중 검증** — `.eq('id', id).eq('user_id', user.id)` 일관 적용
3. **Tombstone 삭제 패턴** — trips + pins 양쪽 구현 (`localStore.ts`)
4. **Storage 경로에 user_id 포함** — 폴더 레벨 격리 (`storage.ts:53`)
5. **데모 모드 fallback** — Supabase 실패 시 로컬 데이터 자동 전환 (`useTrips.ts:256-261`)
6. **photo_captions 이중 저장소 병합** — DB + localStorage 병합, 로컬 우선 (`useTrips.ts:95-99`)
7. **visibilitychange 쓰로틀 refetch** — 30초 쓰로틀로 크로스 디바이스 동기화 (`useTrips.ts:281-291`)

---

## 에이전트 3: UI/UX & 접근성 전문가

### 🔴 Critical Issues

#### U-C1. `aria-*` 속성 전혀 없음 — 전체 코드베이스

**전 파일 대상** (grep `aria-`: 0건)

**구체적 위반 목록:**

- **TripFormModal.tsx (L.190–200)**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 없음
- **ConfirmModal.tsx (L.24–28)**: 위험 동작 확인 모달인데 `role="alertdialog"`, `aria-describedby` 없음
- **Header.tsx (L.80–93)**: 드롭다운에 `aria-expanded`, `aria-haspopup` 없음
- **BottomNav.tsx (L.13–58)**: `nav`에 `aria-label` 없고, 현재 페이지 `aria-current="page"` 없음

---

#### U-C2. `<html lang="en">` — 한국어 앱

**파일**: `index.html` L.2

WCAG 3.1.1 Language of Page 위반. 스크린 리더가 한국어를 영어로 발음.

**수정**: `<html lang="ko">`

---

#### U-C3. 모달/오버레이 포커스 트랩 미구현

**파일**: `TripFormModal.tsx`, `ConfirmModal.tsx`, `PlaceSearchModal.tsx`, `PhotoGallery.tsx`, `HomePage.tsx`

모달이 열려도 Tab 키로 배경 콘텐츠로 포커스 이탈. 전체 모달에서 포커스 트랩 로직 전혀 없음. ESC 닫기는 `PhotoGallery.tsx AlbumView` 하나에만 구현.

---

#### U-C4. 인터랙티브 `<div>` — 키보드 접근 불가

**파일**: `PhotoUpload.tsx` L.289–299

```tsx
<div
  onClick={() => fileInputRef.current?.click()}
  className="border-2 border-dashed ... cursor-pointer"
>
```

키보드로 파일 업로드 영역 접근 불가. `<button>` 또는 `role="button" tabIndex={0} onKeyDown` 필요.

**파일**: `PhotoGallery.tsx` L.255–259 — `<p>` 태그에 onClick

**파일**: `HomePage.tsx` L.628 — 모달 오버레이 div에 onClick

---

#### U-C5. SVG 아이콘 모두 `aria-hidden` 누락

**전체 컴포넌트** — 버튼/링크 내 장식용 SVG에 `aria-hidden="true"` 없음. 스크린 리더가 SVG 경로를 읽으려 시도.

---

#### U-C6. 폼 필드와 `<label>` 연결 미비

**파일**: `TripFormModal.tsx`, `TripFormPage.tsx`, `PinFormPage.tsx`

전체 폼에서 `<label htmlFor>` + `<input id>` 연결 없음. 스크린 리더가 어떤 input에 대한 label인지 알 수 없음.

---

#### U-C7. 별점 버튼 접근성 없음

**파일**: `PinFormPage.tsx` L.387–397

```tsx
{[1, 2, 3, 4, 5].map((star) => (
  <button key={star} type="button" onClick={() => setRating(rating === star ? null : star)}>
    ★
  </button>
))}
```

`aria-label="별점 3점"`, `aria-pressed` 없어 현재 선택 상태를 스크린 리더가 알 수 없음.

---

### 🟡 Improvements Needed

#### U-I1. 다크 모드 — `!important` 남용

**파일**: `src/index.css` L.82–145 (약 40줄의 `!important` 오버라이드)

Tailwind 4의 `dark:` prefix와 전역 CSS `!important`가 혼용. 새 컴포넌트 작성 시 어느 방식을 써야 하는지 일관성 없음.

---

#### U-I2. 초소형 텍스트 WCAG 위반 가능성

22개 파일에 `text-[10px]` 130회, `text-[9px]`, `text-[8px]` 다수. WCAG 1.4.4: 200% 확대 시 최소 크기 요구사항 미충족.

---

#### U-I3. Toast — `role="alert"` 및 `aria-live` 누락

**파일**: `ToastContext.tsx` L.87–96

토스트 알림이 동적으로 추가되어도 스크린 리더가 자동 읽지 않음. 에러: `aria-live="assertive"`, 성공: `aria-live="polite"` 적용 필요.

---

#### U-I4. `prefers-reduced-motion` 미처리

`SpaceTrips.tsx` 행성 공전 애니메이션, `index.css` hover 트랜스폼 등이 `@media (prefers-reduced-motion: reduce)` 없이 동작.

---

#### U-I5. 컬러만으로 상태 구분 — 색맹 접근성

지도 핀이 색상만으로 구분되며 모양 동일. 적록색맹 사용자는 visited(초록)와 planned(주황) 구분 어려움.

---

#### U-I6. `ErrorBoundary` 디자인 시스템 이탈

**파일**: `src/components/ErrorBoundary.tsx` L.26–40

인라인 `style`만 사용, Tailwind/네오브루탈리스트 미적용, 다크모드 미지원.

---

#### U-I7. TripFormModal 저장 버튼 hover 색상 버그

**파일**: `TripFormModal.tsx` L.331-337

오렌지(`#f48c25`) 버튼의 hover 색상이 레드(`#e85d5d`)로 설정. 의도하지 않은 혼란.

---

#### U-I8. 검색 입력에 `label` 없음

**파일**: `SearchFilter.tsx` L.56-62

placeholder만 있고 `<label>` 또는 `aria-label` 없음.

---

#### U-I9. 모달 열릴 때 autoFocus 위치 불일치

**파일**: `TripFormModal.tsx` L.277

Title input에 autoFocus — 상태 선택 버튼이 먼저인 논리적 순서와 불일치.

---

#### U-I10. 로딩 인디케이터 접근성 없음

**파일**: `App.tsx` L.56-59

`role="status"` 또는 `aria-label="로딩 중"` 없어 스크린 리더에게 전달 안 됨.

---

#### U-I11. 이미지 `alt` 텍스트 품질 문제

- `Header.tsx` L.154: `alt="profile"` → 사용자 이름 포함 필요
- `TimelinePage.tsx` L.111: `alt=""` → 정보 전달 이미지에 빈 alt 부적절

---

#### U-I12. Skeleton에 `aria-busy` 없음

스켈레톤 UI가 로딩 중임을 AT에게 전달하지 못함.

---

#### U-I13. `<button>` type 속성 누락

**파일**: `Header.tsx` L.61-75, L.80-93 — `type="button"` 명시 없음.

---

### 🟢 Good Practices

1. **터치 타겟 크기 준수** — `min-w-[44px] min-h-[44px]` (`BottomNav.tsx`)
2. **모바일 퍼스트 반응형** — 바텀 시트↔중앙 모달 전환 일관 적용
3. **Safe Area Inset** — `env(safe-area-inset-bottom)` 처리
4. **이미지 `loading="lazy"`** — 갤러리 이미지에 적용
5. **XSS 방지 `escapeHtml`** — Leaflet 팝업
6. **ESC 키 닫기** — `PhotoGallery.tsx AlbumView`
7. **폼 유효성 검증** — onBlur 기반 touched 패턴
8. **다크모드 시스템 설정 자동 감지** — `useDarkMode.ts`
9. **Skeleton UI** — 레이아웃 시프트(CLS) 감소
10. **EmptyState 컴포넌트** — 일관된 빈 상태 처리

---

## 에이전트 4: 보안 & 성능 전문가

### 🔴 Critical Issues

#### S-C1. CSP(Content Security Policy) 헤더 없음

**파일**: `index.html`, `vercel.json`

CSP, `X-Frame-Options`(클릭재킹 방지), `X-Content-Type-Options: nosniff`, `Referrer-Policy` 모두 누락.

**권장 수정 (vercel.json):**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." }
      ]
    }
  ]
}
```

---

#### S-C2. CORS 와일드카드 설정 — Edge Function

**파일**: `supabase/functions/send-share-email/index.ts`, 라인 11

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",   // 모든 도메인 허용
};
```

어느 도메인에서도 Edge Function 호출 가능. 이메일 발송 기능이므로 스팸 악용 위험.

**수정**: `https://anecdote-world.vercel.app`으로 제한.

---

#### S-C3. 임의 URL 입력 검증 누락

**파일**: `PhotoUpload.tsx` L.118-123

```typescript
const addUrl = () => {
  const url = urlInput.trim();
  if (!url) return;
  onChange([...photos, url]);  // URL 검증 없이 추가 → img src로 사용
};
```

`javascript:alert(1)` 또는 `data:text/html,...` 입력 가능. CSP 없으므로 방어막 0.

**수정**: `new URL(url).protocol === 'https:'` 검증 추가.

---

#### S-C4. 초대 이메일 유효성 검증 누락

**파일**: `TripDetailPage.tsx` L.92, `useShares.ts` L.370

이메일 형식 검증 없이 임의 문자열이 `invited_email`로 DB에 저장.

---

### 🟡 Improvements Needed

#### S-I1. `pin_photos` 테이블에 user_id 필터 누락

**파일**: `useFavoritePhotos.ts` L.82-87

PostgREST 임베디드 필터 사용이나 `pin_photos` 직접 필터 아님.

---

#### S-I2. 공유 수락 시 본인 확인 불충분 (데모 모드)

**파일**: `useShares.ts` L.416-428

타임스탬프 기반 예측 가능한 ID(`share-${Date.now()}`)로 누구나 수락 가능.

---

#### S-I3. `syncLocalDataToSupabase` 뮤텍스 락 불완전

**파일**: `syncLocal.ts` L.18-21

`getItem`과 `setItem` 사이 경쟁 조건.

---

#### S-I4. 이메일 발송 Edge Function 인증 없음

**파일**: `src/lib/email.ts` L.19

anon key 탈취 시 임의 이메일 발송 가능.

---

#### S-I5. localStorage에 민감한 데이터 평문 저장

**파일**: `localStore.ts` L.11-13

여행 제목, 메모, 방문 장소, 경비 등 개인 정보가 평문으로 localStorage에 저장.

---

#### S-I6. console.error/warn 과다 — 운영 환경 정보 노출

40개의 `console.error/warn`이 브라우저 콘솔에 내부 시스템 정보 노출.

---

#### S-I7. `getSession()` vs `getUser()` 혼용

**파일**: `useTrips.ts` L.586

`getSession()`은 캐시된 세션 반환, 토큰 만료 재검증 안 함. 중요 데이터 접근 시 `getUser()` 권장.

---

#### S-I8. 공유 여행 조회 시 소유자의 전체 여행 가져옴

**파일**: `useTrips.ts` L.185-191

```typescript
const { data } = await supabase
  .from('trips')
  .select('*')
  .in('user_id', otherOwnerIds)  // 특정 trip 공유와 무관하게 소유자의 모든 여행
```

한 여행만 공유해도 소유자의 신규 여행이 자동으로 노출.

---

#### S-I9. 외부 API fetch에 타임아웃 없음

**파일**: `useExchangeRate.ts` L.72, `PlaceSearchModal.tsx` L.97-98

Photon, Nominatim, Frankfurter API에 `AbortController` 없음.

---

#### S-I10. npm audit 취약점 3건

| 패키지 | 심각도 | 취약점 |
|--------|--------|--------|
| `rollup` 4.0.0–4.58.0 | High | 경로 탐색을 통한 임의 파일 쓰기 |
| `minimatch` ≤3.1.3 | High | ReDoS 취약점 |
| `ajv` <6.14.0 | Moderate | ReDoS 취약점 |

---

#### S-I11. 지오코딩 API Rate Limit 미처리

**파일**: `PlaceSearchModal.tsx` L.154-158

Nominatim 1초당 1회 제한이나 코드는 500ms 디바운스. 429 응답 처리 없음.

---

### 🟢 Good Practices

1. **user_id 필터** — 대부분의 mutation에 `.eq('user_id', user.id)` 적용
2. **OAuth redirectTo** — `window.location.origin` 동적 생성 (`AuthContext.tsx:103`)
3. **코드 스플리팅** — 주요 페이지 모두 `React.lazy`, 이미지 압축 로직 존재

---

## 에이전트 5: DevOps/DX 엔지니어

### 🔴 Critical Issues

#### X-C1. CI/CD 파이프라인 완전 부재

`.github/` 디렉토리 없음. git hooks도 모두 `.sample` (비활성). 타입 에러나 린트 위반이 있어도 프로덕션 배포 가능.

**권장**: `.github/workflows/ci.yml` 생성, PR시 `tsc --noEmit` + `eslint .` + 빌드 검증.

---

#### X-C2. 테스트 코드 완전 부재

단위/통합/E2E 테스트 **0개**. `package.json`에 `test` 스크립트도 없음.

**권장**: Vitest + React Testing Library, 핵심 유틸부터 단위 테스트 시작.

---

#### X-C3. `'demo-user-001'` 하드코딩 문자열 7개 파일 산재

- `TripFormModal.tsx` 라인 89, 141
- `TripFormPage.tsx` 라인 181, 268, 315
- `PinFormPage.tsx` 라인 128
- `useShares.ts` 라인 522
- `TripDetailPage.tsx` 라인 418

`AuthContext.tsx`에 `DEMO_USER.id` 정의 있으나 import 없이 직접 문자열 사용.

---

#### X-C4. 동일 모듈에서 분리된 import

**파일**: `TripFormModal.tsx` L.4-5

```typescript
import { createTrip } from '../hooks/useTrips';
import { addDemoTrip } from '../hooks/useTrips';
// → import { createTrip, addDemoTrip } from '../hooks/useTrips';
```

ESLint `no-duplicate-imports` 룰 미설정.

---

#### X-C5. Prettier 미설치

`.prettierrc`, `.prettierignore` 없음. 코드 포맷팅 일관성 보장 불가.

---

### 🟡 Improvements Needed

#### X-I1. `tripStatus → pinStatus` 변환 로직 7회 반복

```typescript
visit_status: status === 'completed' ? 'visited' : status === 'wishlist' ? 'wishlist' : 'planned',
```

`tripStatusToPinStatus()` 헬퍼 함수 추출 필요.

---

#### X-I2. `EXPENSE_CATEGORIES` 배열 2곳 선언

`TripFormPage.tsx` L.16-18, `TripDetailPage.tsx` L.24-26 — 완전히 동일한 배열.

---

#### X-I3. Photon/Nominatim 지오코딩 패턴 3곳 반복

`TripFormPage.tsx`, `PlaceSearchModal.tsx`, `DestinationPicker.tsx` — `lib/geocoding.ts`로 통합 권장.

---

#### X-I4. 대용량 파일

| 파일 | 줄 수 |
|------|-------|
| `TripDetailPage.tsx` | 1,285 |
| `useShares.ts` | 975 |
| `useTrips.ts` | 747 |
| `HomePage.tsx` | 743 |
| `TripFormPage.tsx` | 648 |

---

#### X-I5. Vite 빌드 설정 최소 (7줄)

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`manualChunks`, `sourcemap`, `chunkSizeWarningLimit`, 경로 별칭(path alias) 모두 없음.

---

#### X-I6. ESLint 커스텀 룰 미설정

`no-duplicate-imports`, `no-console`, `@typescript-eslint/no-explicit-any` 등 빠져 있음.

---

#### X-I7. console.warn/error 33개

프로덕션 코드에 내부 시스템 정보 노출. Sentry 같은 에러 모니터링 서비스 연동 고려 필요.

---

#### X-I8. ErrorBoundary — 에러 메시지 직접 노출, Tailwind 미적용

`this.state.error?.message`를 사용자에게 그대로 보여줌. 다크모드 미지원.

---

#### X-I9. 중복된 `NotFoundPage` 라우트

**파일**: `App.tsx` L.100-102

ProtectedLayout 안과 밖에 `<Route path="*" element={<NotFoundPage />} />` 중복.

---

#### X-I10. `as unknown as` 타입 단언

`useTrips.ts:95`, `useShares.ts:51` — 타입 안전성 우회.

---

#### X-I11. `sampleData.ts` — 실질적 죽은 코드

```typescript
export const sampleTrips: Trip[] = [];
export const samplePins: Pin[] = [];
```

두 배열 모두 비어있고 어떤 파일에서도 import하지 않음.

---

#### X-I12. `useShares.ts` L.522 — 이상한 auth 흉내 패턴

```typescript
const { data: { user } } = { data: { user: { id: 'demo-user-001', email: '' } } };
```

---

#### X-I13. `.gitignore` — `.env.staging` 등 미커버리지

`.env.*.local` 패턴만 있음. `.env.staging`, `.env.production` 커버 안 됨.

---

#### X-I14. `useExchangeRate` — error 상태 없음

`catch(() => { setRate(null); })` — 실패와 로딩 중 구분 불가.

---

#### X-I15. `vercel.json` — 캐싱 헤더, 보안 헤더 없음

SPA rewrites만 있음.

---

#### X-I16. `syncLocal.ts` 동기화 락 — 멀티 탭 경쟁 조건

`BroadcastChannel` 또는 `navigator.locks` API가 더 적절.

---

#### X-I17. `useFavoritePhotos.ts` — `any` 타입 사용

L.91-92: `eslint-disable-next-line` 코멘트로 억제.

---

#### X-I18. `tsconfig.app.json` — `noImplicitReturns` 미설정

복잡한 함수에서 암묵적 `undefined` 반환 발생 가능.

---

### 🟢 Good Practices

1. **TypeScript strict 설정** — `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`
2. **`import type` 일관 사용** — 런타임 번들 최적화
3. **지도 컴포넌트 Lazy Loading** — Leaflet 번들 분리
4. **`mountedRef` 패턴** — 메모리 누수 방지
5. **`fetchIdRef` 경쟁 조건 방지** — 오래된 응답 무시
6. **ErrorBoundary 루트 배치** — 런타임 에러 시 흰 화면 방지
7. **XSS 방지 `escapeHtml`** — Leaflet 팝업
8. **데이터 격리 `user_id` 필터** — 대부분의 쿼리에 적용
9. **visibilitychange + 쓰로틀** — 자동 갱신
10. **SPA rewrites** — vercel.json
11. **`.env.example`** — 환경변수 문서화
12. **한국어 주석 및 풍부한 README** — docs/ 폴더에 DB 스키마, 마이그레이션 SQL 관리

---

## 교차 분석 종합 요약

### 여러 에이전트가 공통으로 지적한 문제 (우선도 높음)

| 문제 | 지적 에이전트 |
|------|-------------|
| `user_id` 필터 누락 (공유 여행 하위 데이터) | 데이터, 보안 |
| CSP 및 보안 헤더 없음 | 보안, DX |
| 접근성(a11y) 전면 부재 | UI/UX |
| 테스트 코드 0개 | DX |
| CI/CD 없음 | DX |
| `TripDetailPage` 1,285줄 God Component | 프론트엔드, DX |
| console.error/warn 운영 환경 노출 | 보안, DX |
| `'demo-user-001'` 하드코딩 산재 | DX |
| `useSharesForTrip` 소유자 검증 없음 | 데이터, 보안 |
| URL 입력 검증 없음 | 보안 |
| 이메일 형식 검증 없음 | 데이터, 보안 |
| 중복 코드 (상수, 헬퍼, 컴포넌트) | 프론트엔드, DX |
| 다크모드 `!important` vs Tailwind `dark:` 혼용 | UI/UX |
| 외부 API 타임아웃 없음 | 보안, DX |

### 모든 에이전트가 인정한 좋은 패턴

| 패턴 | 인정 에이전트 |
|------|-------------|
| Race condition 방지 (`fetchIdRef` + `mountedRef`) | 프론트엔드, 데이터, DX |
| TypeScript strict + `import type` | 프론트엔드, DX |
| 코드 스플리팅 + Lazy Loading | 프론트엔드, 보안, DX |
| XSS 방지 `escapeHtml` | 프론트엔드, UI/UX, DX |
| Supabase 실패 시 데모 모드 자동 전환 | 데이터 |
| Tombstone 삭제 패턴 | 프론트엔드, 데이터 |

---

## 우선순위 액션 플랜

### P0 — 즉시 수정 (1시간 이내)

| # | 작업 | 난이도 | 영향도 | 관련 이슈 |
|---|------|--------|--------|----------|
| 1 | `<html lang="ko">` 수정 | 1분 | 접근성 | U-C2 |
| 2 | `vercel.json` 보안 헤더 추가 (CSP, X-Frame-Options 등) | 30분 | 보안 | S-C1 |
| 3 | Edge Function CORS `*` → 특정 도메인 제한 | 5분 | 보안 | S-C2 |

### P1 — 단기 수정 (1-2일)

| # | 작업 | 난이도 | 영향도 | 관련 이슈 |
|---|------|--------|--------|----------|
| 4 | 모든 모달에 `role="dialog"` + 포커스 트랩 추가 | 2시간 | 접근성 | U-C1, U-C3 |
| 5 | Toast에 `role="alert" aria-live` 추가 | 15분 | 접근성 | U-I3 |
| 6 | CI workflow 추가 (`tsc --noEmit` + `eslint .` + build) | 1시간 | DX | X-C1 |
| 7 | `useSharesForTrip`에 소유자 검증(`.eq('owner_id', userId)`) 추가 | 15분 | 보안 | D-C1 |
| 8 | `revokeAllShares`에 `auth.getUser()` 추가 | 15분 | 보안 | D-C2 |
| 9 | URL 입력 검증 (`https://` 제한) | 15분 | 보안 | S-C3 |
| 10 | 이메일 형식 검증 추가 (클라이언트 + 서버) | 15분 | 보안 | S-C4 |
| 11 | 폼 `<label htmlFor>` + `<input id>` 연결 | 1시간 | 접근성 | U-C6 |

### P2 — 중기 개선 (1주)

| # | 작업 | 난이도 | 영향도 | 관련 이슈 |
|---|------|--------|--------|----------|
| 12 | Vitest + 핵심 유틸 단위 테스트 | 반나절 | DX | X-C2 |
| 13 | `TripDetailPage` 서브 컴포넌트 분리 | 반나절 | 유지보수성 | F-C1 |
| 14 | `'demo-user-001'` 상수화 (`DEMO_USER_ID` export) | 30분 | DX | X-C3 |
| 15 | `deleteTrip` 후 `deleteLocalTrip` 호출 추가 | 15분 | 데이터 일관성 | D-C4 |
| 16 | `database.ts`에 `photo_captions` 필드 추가 | 10분 | 타입 안전성 | F-C4 |
| 17 | `tripStatusToPinStatus()` 헬퍼 함수 추출 (7곳 중복) | 30분 | DX | X-I1 |
| 18 | `ShareModal` 컴포넌트 추출 (HomePage + TripDetailPage) | 2시간 | DX | F-C5 |
| 19 | `useConfirmModal()` 훅 추출 (3곳 중복) | 1시간 | DX | F-I8 |
| 20 | npm audit fix 실행 | 15분 | 보안 | S-I10 |

### P3 — 장기 개선 (2주+)

| # | 작업 | 난이도 | 영향도 | 관련 이슈 |
|---|------|--------|--------|----------|
| 21 | 다크모드 `!important` → Tailwind `dark:` 마이그레이션 | 반나절 | UI 일관성 | U-I1 |
| 22 | 지오코딩 로직 `lib/geocoding.ts`로 통합 | 2시간 | DX | X-I3 |
| 23 | Vite 청크 분리 (`manualChunks`) + 경로 별칭 | 1시간 | 성능 | X-I5 |
| 24 | Prettier 설치 및 `.prettierrc` 설정 | 30분 | DX | X-C5 |
| 25 | 외부 API AbortController + 타임아웃 추가 | 1시간 | 안정성 | S-I9 |
| 26 | 데이터 훅 캐싱 레이어 도입 (Context 또는 TanStack Query) | 1일 | 성능 | F-C2 |
| 27 | `@media (prefers-reduced-motion)` 처리 | 1시간 | 접근성 | U-I4 |
| 28 | 지도 핀 모양 차별화 (색맹 접근성) | 2시간 | 접근성 | U-I5 |
| 29 | `saveExpenses`/`saveChecklistItems` upsert 전환 | 1시간 | 성능 | D-I3 |
| 30 | `sampleData.ts` 죽은 코드 정리 | 5분 | DX | X-I11 |
