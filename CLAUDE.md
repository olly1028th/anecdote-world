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

## 최근 변경 이력

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
