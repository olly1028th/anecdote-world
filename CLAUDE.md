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
├── components/       # 재사용 UI (TripCard, WorldMap, PhotoGallery 등)
│   └── Map/          # Leaflet 맵 컴포넌트 (lazy)
├── pages/            # 라우트 페이지 (*Page.tsx)
├── contexts/         # AuthContext, ToastContext
├── hooks/            # useTrips, usePins, useShares, useStats 등
├── types/            # database.ts (DB snake_case), trip.ts (UI camelCase)
├── utils/            # format.ts, countryFlag.ts, sampleData.ts
├── lib/              # supabase.ts, storage.ts, cloudinary.ts
├── App.tsx           # 라우트 정의 (ProtectedLayout)
└── main.tsx          # 엔트리포인트
```

## 핵심 아키텍처

### 데이터 모델

- **DB 스키마**: snake_case (`trip_id`, `cover_image`, `visit_status`)
- **UI 모델**: camelCase (`tripId`, `coverImage`)
- `useTrips.ts`의 `mapDbTripToUi()` 함수가 DB→UI 변환 담당
- 핀(pins) → 방문핀은 itinerary, 계획/위시핀은 places로 변환

### 인증 & 데모 모드

- `isSupabaseConfigured` (lib/supabase.ts): `.env`에 Supabase 설정 여부
- **데모 모드** (`!isSupabaseConfigured`): 하드코딩 DEMO_USER, localStorage 영구 보관
- **Supabase 모드**: 쿼리 실패 시 데모 데이터로 fallback, 미로그인 시에도 데모 데이터 표시
- 모듈 레벨 `demoExtraTrips`/`demoExtraPins`가 localStorage와 동기화

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
  - `pin-added`: usePins refetch 트리거
  - `share-updated`: useShares refetch 트리거
  - `open-trip-modal`: 여행 추가 모달 열기

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

- `savePlaces()`가 일정 장소를 핀으로 저장할 때 `lat: 0, lng: 0` 사용 (좌표 미확인 장소)
- **세계지도에서 반드시 `(lat === 0 && lng === 0)` 핀 필터링** — 안 하면 아프리카 서해안에 표시
- `day_number != null` 핀도 메인 지도에서 제외 (세부 일정용)
- 자동 지오코딩: Nominatim API (`fetch` → `lat/lng` 변환), 실패 시 좌표 없이 저장

## 공유/초대 시스템

- `trip_shares` 테이블: `owner_id`(소유자), `invited_email`(초대 대상), `permission`(read/edit), `status`(pending/accepted/declined)
- `removeShare`/`updateSharePermission`: `owner_id` === 현재 사용자 검증 필수
- `acceptShare`/`declineShare`: `invited_email` === 현재 사용자 이메일 검증 필수
- 공유 여행 조회: `.or(`invited_user_id.eq.${userId},invited_email.eq.${userEmail}`)` 패턴
