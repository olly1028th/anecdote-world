# Anecdote World — 개발 가이드

## 프로젝트 개요

개인 여행 기록 웹앱. 레트로/네오브루탈리스트 디자인 + 우주/행성 메타포("여행 = 행성", "핀 = 은하계").
한국어 UI 기본. 데모: https://anecdote-world.vercel.app

## 기술 스택

- **프론트엔드**: React 19 + TypeScript 5.9 + Vite 7
- **스타일링**: Tailwind CSS 4 (네오브루탈리스트: 3px 두꺼운 테두리, 컬러 오프셋 그림자, 레트로 타이포)
- **백엔드/DB**: Supabase (PostgreSQL) + Supabase Auth (Google/Kakao OAuth)
- **지도**: Leaflet + react-leaflet 5 (OpenStreetMap, marker clustering)
- **스토리지**: Supabase Storage (trip-photos 버킷) + Cloudinary
- **라우팅**: React Router 7 (lazy loading)
- **배포**: Vercel

## 빌드 & 스크립트

```bash
npm run dev       # 개발 서버 (Vite)
npm run build     # 프로덕션 빌드
npx tsc --noEmit  # 타입 체크만
```

## 디렉토리 구조

```
src/
├── components/       # 재사용 UI (TripCard, WorldMap, PhotoGallery, Checklist 등)
│   └── Map/          # Leaflet 맵 컴포넌트 (lazy): WorldMap, PinMarker, DayRouteMap
├── pages/            # 라우트 페이지 (*Page.tsx)
├── contexts/         # AuthContext, ToastContext
├── hooks/            # useTrips, usePins, useShares, useStats 등
├── types/            # database.ts (DB snake_case), trip.ts (UI camelCase)
├── utils/            # format.ts, countryFlag.ts, sampleData.ts (하드코딩 샘플)
├── lib/              # supabase.ts, storage.ts, cloudinary.ts, localStore.ts (사용자 로컬 데이터)
├── App.tsx           # 라우트 정의 (ProtectedLayout)
└── main.tsx          # 엔트리포인트
```

## 핵심 아키텍처

### 데이터 모델

- **DB 스키마**: snake_case (`trip_id`, `cover_image`, `visit_status`)
- **UI 모델**: camelCase (`tripId`, `coverImage`)
- `useTrips.ts`의 `mapDbTripToUi()` 함수가 DB→UI 변환 담당
- 핀(pins) → 방문핀은 itinerary, 계획/위시핀은 places로 변환
- `Place` 타입에 `lat?`/`lng?` 좌표 포함 — 장소 검색(Photon API)으로 등록, day별 이동동선 지도 표시에 사용

### 로컬 데이터 저장소 (`src/lib/localStore.ts`)

사용자 직접 등록 데이터와 하드코딩 샘플 데이터가 **파일 레벨로 분리**됨:

| 구분 | 파일 | 역할 |
|------|------|------|
| 샘플 데이터 | `src/utils/sampleData.ts` | 하드코딩 여행/핀 (sampleTrips, samplePins) |
| 사용자 데이터 | `src/lib/localStore.ts` | localStorage CRUD (getLocalTrips, addLocalTrip 등) |

- `localStore.ts`: 모듈 레벨 캐시 (`localTrips`, `localPins`) + localStorage 영구 보관
- `getMergedDemoTrips()`: 사용자 로컬 여행 + 샘플 여행 병합 (삭제된 ID 제외)
- `useTrips.ts`/`usePins.ts`에서 Supabase SELECT 성공 시에도 로컬 데이터 병합:
  ```typescript
  const extraLocal = getLocalTrips().filter((t) => !dbIds.has(t.id) && !getDeletedTripIds().has(t.id));
  setTrips([...mapped, ...extraLocal]);
  ```
- 후방 호환성을 위한 re-export: `addDemoTrip`, `updateDemoTrip`, `deleteDemoTrip`, `addDemoPin`

### 인증 & 데모 모드

- `isSupabaseConfigured` (lib/supabase.ts): `.env`에 Supabase 설정 여부
- **데모 모드** (`!isSupabaseConfigured`): 하드코딩 DEMO_USER, localStorage 영구 보관
- **Supabase 모드**: 쿼리 실패 시 데모 데이터로 fallback, 미로그인 시에도 데모 데이터 표시
- Supabase INSERT 실패 시 `localStore.ts`의 fallback 저장소 사용

### 데이터 격리 (중요!)

- **모든 SELECT 쿼리는 반드시 `user_id` 필터 필요** — 없으면 타 계정 데이터 노출
- **모든 UPDATE/DELETE는 `.eq('user_id', user.id)` 필수** — 타 계정 데이터 변경 방지
- 공유받은 여행: `trip_shares` 테이블에서 `status='accepted'` + `invited_user_id` 또는 `invited_email`로 조회
- `useTrips`/`usePins`: 내 데이터 + 공유받은 여행 데이터 병합, 중복 제거
- `useTrip` (단건): 소유자이거나 공유 수락 여부 검증 후 데이터 반환

### 상태 관리 & 이벤트

- React Context (Auth, Toast) + 커스텀 훅
- 커스텀 이벤트로 교차 컴포넌트 refetch:
  - `trip-added`: useTrips refetch 트리거
  - `pin-added`: usePins refetch 트리거 (savePlacesInline, PinFormPage에서 dispatch)
  - `share-updated`: useShares refetch 트리거
  - `open-trip-modal`: 여행 추가 모달 열기
- **중요**: 핀/장소를 생성·수정하는 모든 경로에서 반드시 `pin-added` 이벤트를 dispatch해야 세계지도에 즉시 반영됨

### 주요 DB 테이블

| 테이블 | 용도 | 키 관계 |
|--------|------|---------|
| `trips` | 여행 (completed/planned/wishlist) | user_id |
| `pins` | 장소 핀 (visited/planned/wishlist) | trip_id, user_id |
| `pin_photos` | 핀별 사진 | pin_id, user_id |
| `expenses` | 여행 경비 | trip_id, user_id |
| `checklist_items` | 준비물 체크리스트 | trip_id, user_id |
| `trip_shares` | 여행 공유/초대 | trip_id, owner_id, invited_email |
| `profiles` | 사용자 프로필 | id (= auth user_id) |

## 데이터 흐름 아키텍처

### 공통 데이터 소스 (3계층)

```
┌─────────────────────────────────────────────────┐
│  1. Supabase DB (PostgreSQL)                    │ ← 로그인 사용자 전용
│     trips, pins, expenses, checklist_items ...   │
├─────────────────────────────────────────────────┤
│  2. localStorage (localStore.ts)                │ ← Supabase INSERT 실패 시 fallback
│     anecdote-demo-trips, anecdote-demo-pins      │
├─────────────────────────────────────────────────┤
│  3. sampleData.ts (하드코딩)                     │ ← 현재 빈 배열 []
│     sampleTrips = [], samplePins = []            │
└─────────────────────────────────────────────────┘
```

### useTrips() 데이터 병합 흐름

```
Supabase 설정됨? ──NO──→ getMergedDemoTrips() (로컬만)
       │
      YES
       │
로그인 됨? ──NO──→ getMergedDemoTrips() (로컬만)
       │
      YES
       │
    ┌──────────────────────────┐
    │ DB에서 내 trips SELECT    │
    │ + trip_shares로 공유 trips │
    │ + expenses, checklist,    │
    │   pins, pin_photos 병합   │
    └──────┬───────────────────┘
           │
           ▼
    mapDbTripToUi() 변환 (snake_case → camelCase)
           │
           ▼
    ┌──────────────────────────────────┐
    │ 로컬 데이터 병합 (항상 실행):       │
    │ extraLocal = getLocalTrips()     │
    │   .filter(t => !dbIds.has(t.id)  │
    │              && !deletedIds)     │
    │                                  │
    │ setTrips([...dbTrips, ...extra]) │
    └──────────────────────────────────┘
```

### usePins() 데이터 병합 흐름

useTrips와 동일 패턴이나 차이점:
- `getMergedDemoTrips()` 대신 `getLocalPins()` 직접 반환 (sampleData 미포함)
- **핀은 삭제 추적(tombstone) 없음** — trips는 `deletedTripIds` Set이 있지만 pins에는 없어서, Supabase DELETE 실패 시 핀이 다시 나타날 수 있음

### 영역별 데이터 소비 구조

#### 1. 스탯카드 (Stats Card)

**파일**: `useStats.ts` → `HomePage.tsx`, `DashboardPage.tsx`, `ProfilePage.tsx`

```
useTrips() → trips[] ──┐
                       ├──→ useStats() ──→ Stats 객체
usePins()  → pins[] ──┘
```

| 스탯 | 데이터 소스 | 필터링 조건 |
|------|-----------|------------|
| 완료된 여행 수 | `trips` | `status === 'completed'` |
| 계획된 여행 수 | `trips` | `status === 'planned'` |
| 방문 국가 수 | `pins` | `getMapDisplayPins()` → `visit_status === 'visited'` → unique `country` |
| 방문 도시 수 | `pins` | 동일, unique `city` |
| 총 지출 | `trips` | **completed trips만** `expenses[]` 합산 |
| 총 사진 수 | `trips` | `trip.photos.length` 합산 |
| 체크리스트 진행 | `trips` | **planned trips만** 집계 |

**⚠️ 불일치 원인**: 국가/도시 카운트는 trips가 아닌 pins 기반이고, `getMapDisplayPins()` 필터를 거침:
- `lat === 0 && lng === 0` 핀 → 제외 (지오코딩 실패)
- `day_number != null` 핀 → main pin 없는 trip만 대표 1개 포함
- **결과: trip은 있는데 유효한 pin이 없으면 국가/도시 0으로 표시**

#### 2. 검색 필터 (Search Filter)

**파일**: `SearchFilter.tsx` → `HomePage.tsx`

```
useTrips() → trips[]
               │
               ├─ completedTrips (status=completed)  ← 스탯 탭 섹션 (고정)
               ├─ plannedTrips   (status=planned)    ← 스탯 탭 섹션 (고정)
               ├─ wishlistTrips  (status=wishlist)   ← 스탯 탭 섹션 (고정)
               │
               └─ displayTrips = useMemo(() => {
                    1단계: statusFilter 적용
                    2단계: searchQuery 적용 (title, destination, memo)
                  })
                    │
                    └──→ "검색 결과" 섹션에만 렌더링
```

| 항목 | 설명 |
|------|------|
| 필터 상태 저장 | 로컬 컴포넌트 state (새로고침 시 초기화, localStorage 미사용) |
| 검색 대상 | `title`, `destination`, `memo` (클라이언트 사이드, 250ms 디바운스) |
| 필터 적용 범위 | **"검색 결과" 섹션에만** 적용 |
| 스탯 탭/지도 | 필터 영향 **받지 않음** |

**⚠️ 불일치 원인**: 필터 뱃지 숫자(tripCounts)는 전체 trips 기준이지만, 화면에 보이는 목록은 필터된 displayTrips만 표시

#### 3. 세계지도 핀 매핑 (World Map Pin Mapping)

**파일**: `usePins.ts` → `mapPins.ts` → `WorldMap.tsx`

```
usePins() → allPins[]
               │
               ▼
        getMapDisplayPins(allPins)    ← src/utils/mapPins.ts
               │
               ├─ 1단계: lat === 0 && lng === 0 제거
               ├─ 2단계: day_number == null 핀 (main pin) 유지
               └─ 3단계: main pin 없는 trip → 첫 번째 day pin 대표 포함
               │
               ▼
        HomePage에서 추가 status 필터 (핀 필터 버튼)
               │
               ▼
        <WorldMap pins={filteredPins} />
               ├─ 15개 이하: PinMarker 개별 렌더
               └─ 15개 초과: ClusterLayer 클러스터링
```

**⚠️ 불일치 원인**:
- trip.places에 장소 있어도 좌표 없으면 (`lat:0, lng:0`) 지도에 안 나옴
- day_number 핀은 main pin이 하나라도 있으면 지도에서 제외
- **trip 장소 수 ≠ 지도 핀 수 ≠ 스탯 국가 수** (각각 다른 필터)

### 3개 영역 불일치 전체 구조

```
┌───────────────────────────────────────────────────────┐
│                   useTrips() → trips[]                │
│  ┌──────────────┬────────────────┬──────────────────┐ │
│  │ Stats Card   │ Search Filter  │ (참조 안 함)      │ │
│  │ 전체 기준     │ 필터된 결과만   │                   │ │
│  └──────┬───────┴───────┬────────┘                   │ │
│         │               │                            │ │
│    숫자 불일치!     검색결과만 영향                      │ │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│                   usePins() → pins[]                  │
│                        │                              │
│                        ▼                              │
│               getMapDisplayPins()                     │
│               ├─ (0,0) 좌표 제외                      │
│               ├─ day_number 핀 대부분 제외              │
│               │                                      │
│               ├──→ Stats: 이 필터된 핀으로 국가/도시     │
│               └──→ WorldMap: 이 필터된 핀으로 마커       │
│                                                      │
│  ⚠️ trip.places 장소 수 ≠ 지도 핀 수 ≠ 스탯 국가 수    │
└───────────────────────────────────────────────────────┘
```

### 웹 vs 모바일 차이

**데이터 로직 차이: 없음** — 동일한 hooks, 동일한 필터, 분기 로직 없음

**레이아웃 차이 (CSS만)**:

| 요소 | 모바일 (< 640px) | 데스크톱 (≥ 640px) |
|------|-----------------|-------------------|
| 스탯 그리드 | `grid-cols-2` (2×2) | `grid-cols-4` (1×4) |
| 지도 높이 | `h-[260px]` | `h-[340px]` → `md:h-[380px]` |
| 핀 필터 버튼 | 좌측 정렬 + 오버플로 스크롤 | 우측 배치 |
| 공유 모달 | 하단 시트 (bottom sheet) | 중앙 정렬 |

**정보가 달라 보이는 실제 원인**:

| 원인 | 설명 |
|------|------|
| 다른 로그인 상태 | 모바일: 미로그인 → 데모 데이터, PC: 로그인 → Supabase 데이터 |
| localStorage 기기별 독립 | Supabase INSERT 실패 시 해당 기기 localStorage에만 저장, 다른 기기에서 없음 |
| Realtime 미사용 | A기기에서 핀 추가 → B기기는 새로고침 전까지 반영 안 됨 (커스텀 이벤트는 같은 탭 내에서만 동작) |

## 스타일링 컨벤션

- **색상 팔레트**: 오렌지 `#f48c25`, 틸 `#0d9488`, 핑크 `#f43f5e`, 노랑 `#eab308`, 다크브라운 `#1c140d`, 크림 배경 `#F9F4E8`
- **테두리**: `border-[3px] border-slate-900 dark:border-slate-100`
- **그림자**: `shadow-[8px_8px_0px_0px_rgba(...)]` (네오브루탈리스트 오프셋)
- **라운드**: `rounded-lg`, `rounded-xl`
- **타이포**: 굵게, 대문자, `tracking-tighter`/`tracking-wider`, 이탤릭 헤딩
- **다크모드**: `dark:` prefix, 배경 `#221910`/`#1a1208`
- **반응형**: 모바일 퍼스트, `sm:` prefix로 태블릿+

## 코딩 컨벤션

- 파일: 컴포넌트 PascalCase, 훅 camelCase `use*`, 페이지 `*Page.tsx`
- 타입 임포트: `import type { Trip }` 사용
- 주석/UI 텍스트: 한국어 (변경 X)
- 날짜 포맷: `YYYY.MM.DD`, 통화: `₩` + `toLocaleString('ko-KR')`
- 에러 핸들링: try-catch + `toast('메시지', 'error')` + `console.error`
- 커밋 메시지: 영어, 명령형 현재시제 ("Fix", "Add", "Enforce")

## 지도 관련 주의사항

- `savePlaces()`가 일정 장소를 핀으로 저장할 때 기존 좌표를 보존 (이름 매칭으로 기존 핀의 lat/lng 재사용)
- 좌표가 없는 장소는 `lat: 0, lng: 0`으로 저장
- **세계지도에서 반드시 `(lat === 0 && lng === 0)` 핀 필터링** — 안 하면 아프리카 서해안에 표시
- `day_number != null` 핀도 메인 지도에서 제외 (세부 일정용)
- 지오코딩: Photon API (`photon.komoot.io`, Nominatim 기반) — TripDetailPage 일정 편집에서 장소 검색
- 자동 지오코딩: Nominatim API (`fetch` → `lat/lng` 변환), 실패 시 좌표 없이 저장

### Day별 이동동선 지도 (`DayRouteMap`)

- `src/components/Map/DayRouteMap.tsx`: Leaflet 기반, lazy 로드 (React.lazy + Suspense)
- 번호 마커 (L.divIcon) + 점선 Polyline으로 이동경로 시각화
- `PlaceList`에서 day별로 좌표가 있는 장소가 1개 이상이면 자동 표시
- 지도 타일: CartoDB Voyager (`basemaps.cartocdn.com`)

## 공유/초대 시스템

- `trip_shares` 테이블: `owner_id`(소유자), `invited_email`(초대 대상), `permission`(read/edit), `status`(pending/accepted/declined)
- `removeShare`/`updateSharePermission`: `owner_id` === 현재 사용자 검증 필수
- `acceptShare`/`declineShare`: `invited_email` === 현재 사용자 이메일 검증 필수
- 공유 여행 조회: `.or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`)` 패턴

## 환율 시스템 (`useExchangeRate`)

### API

- **Frankfurter API** (`https://api.frankfurter.dev/v1/latest?base=KRW&symbols={currency}`)
- ECB(유럽중앙은행) 데이터 기반 무료 오픈소스 API, 인증 불필요
- `fetchWithTimeout` 래퍼로 타임아웃 처리
- 응답: `{ rates: { JPY: 0.09 }, date: "2026-03-04" }`

### 통화 감지 흐름

```
trip.destination ("일본 도쿄")
       │
       ▼
  detectCurrency(destination)  ← COUNTRY_TO_CURRENCY 매핑 (30+ 국가)
       │
       ▼
  currency code ("JPY")
       │
       ▼
  useExchangeRate(destination)
       ├─ Frankfurter API 호출 (KRW→JPY)
       └─ ExchangeRateInfo { rate, symbol, currencyName, updatedAt }
```

### 환율 사용처

| 위치 | 용도 |
|------|------|
| `TripDetailPage` 헤더 | 계획 여행에 환율 정보 패널 표시 |
| `InlineExpenseEditor` | 현지 통화 입력 시 KRW 환산액 실시간 표시 |
| `ExpenseTable` | 현지 통화 경비의 KRW 환산 표시 + 총합 KRW 환산 |
| Budget 스탯 카드 | `totalExpensesInKRW()` 로 다중 통화 총합 표시 |

### 환산 공식

- KRW→LOCAL rate = `exchangeRate.rate` (예: KRW→JPY = 0.09)
- **LOCAL→KRW**: `localAmount / rate` (예: ¥1,000 / 0.09 ≈ ₩11,111)
- **KRW→LOCAL**: `krwAmount * rate`

## 경비 시스템 (다중 통화 + 일자별)

### Expense 데이터 모델

```typescript
interface Expense {
  id?: string;
  category: ExpenseCategory;  // 'flight' | 'hotel' | 'food' | 'transport' | 'activity' | 'shopping' | 'other'
  amount: number;             // 입력한 통화 기준 금액
  currency?: string;          // 'KRW' (기본) | 'USD' | 'JPY' 등
  label: string;              // 설명
  spentAt?: string;           // 'YYYY-MM-DD' 지출 날짜
}
```

- DB: `expenses` 테이블의 `currency`, `spent_at` 컬럼에 저장
- `mapDbTripToUi()`에서 `currency` → `currency`, `spent_at` → `spentAt` 변환
- `saveExpenses()`에서 `currency`, `spentAt` → DB `currency`, `spent_at` 저장
- `amount`는 **입력한 통화 기준** 저장 (KRW가 아닌 원래 통화 금액)

### 총합 계산

- `totalExpenses()`: 단순 합산 (단일 통화용, 기존 호환)
- `totalExpensesInKRW(expenses, exchangeRate)`: 다중 통화 KRW 환산 합계
  - currency === 'KRW' → 그대로 합산
  - currency !== 'KRW' → `amount / exchangeRate` 변환 후 합산
  - exchangeRate 없으면 → 그대로 합산 (fallback)

### 일자별 그룹핑 (ExpenseTable)

- `spentAt`가 하나라도 있으면 자동 그룹핑 활성화
- Day 번호 = `(spentAt - trip.startDate) / 1일 + 1`
- 날짜 미지정 항목 → "날짜 미지정" 별도 그룹
- 그룹별 소계 (KRW 환산) 표시
- 모든 경비에 날짜가 없으면 기존 플랫 리스트 유지

## 여행 상태 전환

### cycleStatus (기존)

`planned → completed → wishlist → planned` 순환. 상태 뱃지 클릭 시 동작.

### markAsCompleted (신규)

planned 여행을 **바로 completed로** 전환. 순환 없이 직접 설정.

- **D-Day 배너**: `trip.status === 'planned'` + `trip.endDate < 오늘` → "여행 다녀오셨나요?" 배너 + "정복 완료!" 버튼
- **상시 버튼**: D-Day 미경과 planned 여행에도 "정복 완료!" 버튼 표시
- 전환 후 `trip-added` + `pin-added` 이벤트 dispatch → 홈 세계지도 즉시 반영

## 최근 변경 이력

### 정복 완료 전환 + 다중 통화 경비 + 일자별 그룹핑

**Phase 1 — 정복 완료 빠른 전환**
- `TripDetailPage`에 `markAsCompleted()` 함수 추가 (바로 completed 전환)
- D-Day 경과 시 "여행 다녀오셨나요?" 배너 자동 표시
- 모든 planned 여행에 "정복 완료!" 버튼 상시 표시

**Phase 2 — 다중 통화 경비 입력**
- `Expense` 타입에 `currency`, `spentAt` 필드 추가
- `InlineExpenseEditor`: 목적지 기반 현지 통화 자동 감지 + 통화 선택 드롭다운
- 현지 통화 입력 시 실시간 KRW 환산액 표시 (= ₩XX,XXX)
- `useExchangeRate` 훅으로 Frankfurter API 환율 조회
- `mapDbTripToUi`/`saveExpenses`에 currency, spent_at 매핑 추가

**Phase 3 — 일자별 경비 그룹핑**
- `ExpenseTable`: spentAt 날짜 기준 자동 그룹핑 + Day N 헤더 + 일별 소계
- `totalExpensesInKRW()` 함수로 다중 통화 총합 KRW 환산
- 카테고리별 비율 차트도 KRW 환산 기준

### 위시리스트 추가 시 메인페이지 미반영 수정

- **문제**: "+" 버튼으로 위시리스트 생성 후 홈페이지에 표시되지 않음
- **원인**: Supabase INSERT 실패 → `localStore`에 저장되었으나, `fetchTrips()`가 DB 결과만 반환하고 로컬 데이터를 무시
- **수정**: `useTrips.ts`/`usePins.ts`에서 Supabase SELECT 성공 시에도 `getLocalTrips()`/`getLocalPins()`를 병합하도록 변경

### 여행 장소 수정 후 세계지도 핀 미반영 수정

- **문제**: planned 여행의 장소 정보 수정 후 메인 세계지도에 핀이 반영되지 않음
- **원인**: 3중 버그 — (1) `savePlaces()`가 기존 좌표를 파괴하고 `lat:0, lng:0`으로 재생성 (2) `savePlacesInline()`에서 `pin-added` 이벤트 미발송 (3) `PinFormPage`에서도 이벤트 미발송
- **수정**: 기존 핀의 좌표를 이름 매칭으로 보존, 모든 핀 생성/수정 경로에 `pin-added` 이벤트 dispatch 추가

### 샘플 데이터와 사용자 데이터 파일 분리

- **변경**: 하드코딩 샘플 데이터(`sampleTrips`, `samplePins`)와 사용자 생성 로컬 데이터를 별도 파일로 분리
- **생성 파일**: `src/lib/localStore.ts` (사용자 localStorage CRUD)
- **이동**: `samplePins`를 `usePins.ts` → `sampleData.ts`로 이동
- **후방 호환**: `useTrips.ts`/`usePins.ts`에서 `addDemoTrip` 등 기존 이름으로 re-export

### 체크리스트 진행률 뱃지와 Edit 버튼 겹침 수정

- **문제**: 체크리스트 진행률(0/3)과 Edit 버튼이 겹쳐 표시
- **수정**: `Checklist` 컴포넌트에 `action?: ReactNode` prop 추가, 절대 위치 → flex 레이아웃으로 변경

### 일정 장소 검색 및 Day별 이동동선 지도 추가

- **변경**: 일정 편집 필드를 "내용/필수등(드롭다운)" → "내용/비고/장소정보(선택)"로 변경
- **지오코딩**: Photon API (`photon.komoot.io`)로 장소명 → 좌표 변환, 검색 결과에서 선택
- **동선 지도**: `DayRouteMap` 컴포넌트 — 번호 마커 + 점선 Polyline으로 day별 이동경로 시각화
- **수정 파일**: `trip.ts` (Place에 lat/lng), `TripDetailPage.tsx`, `PlaceList.tsx`, `Map/DayRouteMap.tsx` (신규), `Map/index.ts`

### 스탯카드/검색필터/세계지도 데이터 일관성 수정

- **문제**: 스탯카드 국가/도시 카운트, 검색필터, 세계지도 핀이 서로 다른 데이터 기준으로 표시
- **원인 1**: `useStats.ts`가 `getMapDisplayPins()` 필터를 거쳐 국가/도시를 집계 → 좌표 (0,0) 핀이나 day_number 핀의 국가 누락
- **수정 1**: 국가/도시 카운트를 전체 핀의 country/city 텍스트 기반으로 변경 (좌표 필터 독립)
- **원인 2**: 핀 삭제 시 tombstone 없음 → Supabase DELETE 실패 시 핀 부활
- **수정 2**: `localStore.ts`에 `deletedPinIds` 추적 추가 (trips의 `deletedTripIds`와 동일 패턴)
- **원인 3**: 다른 기기에서 동일 계정 사용 시 데이터 불일치 (Realtime 미사용)
- **수정 3**: `useTrips`/`usePins`에 `visibilitychange` 이벤트 리스너 추가 → 탭 활성화 시 30초 쓰로틀로 자동 refetch
- **수정 파일**: `useStats.ts`, `localStore.ts`, `usePins.ts`, `useTrips.ts`
