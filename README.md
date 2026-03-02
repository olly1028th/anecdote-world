# Anecdote World

> *Life is short and the world is wide.*

나만의 여행 기록을 지도 위에 남기고, 다음 여행을 계획하는 개인 여행 트래커 웹앱입니다.

**Live Demo:** [https://anecdote-world.vercel.app](https://anecdote-world.vercel.app)

## Features

- **Stitch 레트로 디자인** — 네오브루탈리즘 스타일의 커스텀 UI 시스템 (굵은 보더, 컬러 쉐도우, 레트로 타이포)
- **여행 CRUD** — 3가지 상태(정복 완료 / 정복 예정 / 위시) 관리 (추가/수정/삭제)
- **인터랙티브 세계지도** — Leaflet + OpenStreetMap 기반 핀 시각화, 행성 아이콘 마커 (방문/계획/위시리스트 색상 구분, 핀 필터링)
- **여행지 검색 & 선택** — 도시/나라 검색 후 지도에서 바로 선택하는 DestinationPicker
- **핀 관리** — 지도 클릭으로 장소 등록, 카테고리·별점·메모 관리, 여행 연결
- **인라인 편집** — 상세 페이지에서 항목별(사진, 경비, 체크리스트, 장소, 메모) 카드를 클릭하여 바로 편집
- **사진 갤러리** — URL/파일 업로드 (Supabase Storage), 라이트박스 뷰어 (이전/다음 네비게이션), 대표 이미지 설정, 인라인 사진 편집
- **경비 추적** — 항공, 숙박, 식비, 교통 등 7개 카테고리별 비용 기록 (인라인 추가/삭제)
- **여행 타임라인** — 일자별 일정 표시
- **준비 체크리스트** — 여행 준비 사항 관리 및 진행률 표시 (인라인 추가/삭제/토글)
- **추천 장소** — must / want / maybe 우선순위 태그 (인라인 추가/삭제), 완료된 여행에서는 비고란으로 전환
- **여행 공유** — 이메일로 다른 유저 초대, 수락/거절, read/edit 권한 관리, 프로필에서 공유받은 여행 목록 확인 및 바로 이동
- **Favorite Moments** — 정복 완료된 여행만 카드로 표시
- **국기 Fallback** — 커버 이미지 없는 여행에 해당 국가 국기를 자동 표시 (flagcdn.com)
- **OAuth 인증** — Google · Kakao 소셜 로그인 (Supabase Auth)
- **데모 모드** — Supabase 없이도 전체 기능 체험 가능, 추가한 데이터는 localStorage에 영구 보관
- **에러 바운더리** — 런타임 에러 시 흰 화면 대신 에러 메시지 표시

## Tech Stack

| 분류 | 기술 |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL) |
| Maps | Leaflet + react-leaflet |
| Auth | Supabase Auth (Google, Kakao OAuth) |
| Routing | React Router 7 |
| Storage | Supabase Storage (trip-photos bucket) |
| Deploy | Vercel |

## Project Structure

```
src/
├── components/        # 재사용 UI 컴포넌트
│   ├── Header.tsx           # 상단 네비게이션 바
│   ├── BottomNav.tsx        # 하단 모바일 네비게이션
│   ├── TripCard.tsx         # 여행 카드 (커버 이미지 + 국기 Fallback)
│   ├── TripFormModal.tsx    # 여행 추가 모달 (Quick Add)
│   ├── DestinationPicker.tsx # 여행지 검색 & 지도 선택
│   ├── DestinationMap.tsx   # 여행지 지도 미니맵
│   ├── PhotoGallery.tsx     # 사진 그리드 + 라이트박스
│   ├── PhotoUpload.tsx      # 사진 업로드 (URL/파일)
│   ├── StatusBadge.tsx      # 상태 뱃지
│   ├── ExpenseTable.tsx     # 경비 테이블
│   ├── Timeline.tsx         # 여행 타임라인
│   ├── PlaceList.tsx        # 추천 장소 리스트
│   ├── Checklist.tsx        # 준비 체크리스트
│   ├── ErrorBoundary.tsx    # 런타임 에러 캐치
│   ├── ProtectedRoute.tsx   # 인증 라우트 가드
│   └── Map/
│       ├── WorldMap.tsx     # Leaflet 월드맵 (lazy loaded)
│       ├── PinMarker.tsx    # 상태별 색상 마커
│       └── DayRouteMap.tsx  # Day별 이동동선 지도 (번호 마커 + Polyline)
├── pages/             # 페이지 컴포넌트
│   ├── HomePage.tsx         # 메인: Stats → 세계지도 → 카드 피드 → Moments
│   ├── LoginPage.tsx        # 소셜 로그인
│   ├── DashboardPage.tsx    # 통계 대시보드
│   ├── ProfilePage.tsx      # 프로필 설정
│   ├── TripDetailPage.tsx   # 여행 상세 (갤러리, 타임라인, 경비)
│   ├── TripFormPage.tsx     # 여행 추가/수정 폼 (Full)
│   └── PinFormPage.tsx      # 핀 추가/수정 폼
├── contexts/
│   └── AuthContext.tsx      # 인증 상태 + 데모 모드
├── hooks/
│   ├── useTrips.ts          # 여행 CRUD + Supabase 연동 + localStorage 영구 보관
│   ├── usePins.ts           # 핀 CRUD + Supabase 연동 + localStorage 영구 보관
│   ├── useShares.ts         # 여행 공유/초대 CRUD
│   ├── useFavoritePhotos.ts # 즐겨찾기 사진
│   ├── useProfile.ts        # 사용자 프로필
│   ├── useStats.ts          # 통계 집계
│   └── useDarkMode.ts       # 다크모드 토글
├── types/
│   ├── trip.ts              # UI 모델
│   └── database.ts          # DB 스키마 (Supabase)
├── utils/
│   ├── format.ts            # 날짜, 통화 포맷팅
│   ├── countryFlag.ts       # 국가명 → 국기 이미지 URL 변환
│   └── sampleData.ts        # (비활성) 샘플 데이터 스텁
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── storage.ts           # Supabase Storage (사진 업로드/삭제, user_id 기반 경로)
│   ├── localStore.ts        # 사용자 로컬 데이터 CRUD (localStorage 영구 보관)
│   ├── cloudinary.ts        # Cloudinary 이미지 URL 변환
│   ├── syncLocal.ts         # 로컬 → Supabase 동기화
│   └── email.ts             # 이메일 관련 유틸리티
├── App.tsx                  # 라우팅 (Layout Route 패턴)
├── main.tsx
└── index.css

docs/
├── DATABASE.md              # DB 스키마 문서
├── schema.sql               # PostgreSQL DDL (테이블 + RLS 정책)
├── storage-policy.sql       # Supabase Storage RLS 정책
├── TEAM-REVIEW-DASHBOARD.md # 5인 전문가 코드 리뷰 대시보드
├── PHASE1-REPORT.md         # Phase 1 보안 + 크리티컬 버그 수정 리포트
├── PHASE2-REPORT.md         # Phase 2 안정성 + UX 일관성 리포트
├── migrations/              # DB 마이그레이션 SQL
│   ├── 001_add_favorite_and_share_rpc.sql
│   └── 002_add_email_based_share_policies.sql
└── references/              # 디자인 레퍼런스 & 기획 문서
    ├── PLANNING.md
    ├── UI_LAYOUT.md
    ├── stitch-reference.html
    ├── stitch_design.html
    ├── code(main).html
    ├── code(login).html
    └── code(detail).html
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/olly1028th/anecdote-world.git
cd anecdote-world
npm install
```

### Environment Variables

`.env.example`을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> 환경 변수 없이도 **데모 모드**로 앱을 사용할 수 있습니다. 추가한 데이터는 localStorage에 영구 보관됩니다.

### Development

```bash
npm run dev
```

### Build & Preview

```bash
npm run build
npm run preview
```

## Development Progress

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 프로젝트 셋업, 기본 UI (TripCard, 홈페이지, 상세페이지) | Done |
| Phase 2 | Supabase 인증 (Google/Kakao OAuth), DB 연동, 데모 모드 | Done |
| Phase 3 | 세계지도 + 핀 시스템 (Leaflet, 마커, 핀 CRUD 폼) | Done |
| Phase 4 | 여행/핀 CRUD 폼, 사진 갤러리, 라이트박스, 대표 이미지 | Done |
| Phase 5 | Stitch 레트로 디자인 시스템 적용, 여행지 검색 DestinationPicker | Done |
| Phase 6 | 데모 데이터 localStorage 영구 보관, 국기 Fallback, 레이아웃 개선 | Done |
| Phase 7 | 상세 페이지 인라인 편집, 데모 모드 데이터 영속성, 사진 인라인 편집 | Done |
| Phase 8 | 여행 공유 기능 (초대/수락/거절, read/edit 권한) | Done |
| Phase 9 | UI/UX 개선 (정복 완료/예정 라벨, 행성 마커, Favorite Moments) | Done |
| Phase 10 | 위시리스트 상태 추가, 데모 모드 저장 버그 수정, 이미지 압축 | Done |
| Phase 11 | Supabase Storage 사진 업로드, Storage RLS 정책, 권한 분리 강화 | Done |
| Phase 12 | 버그 수정 (React #310, 사진 업로드, 공유 에러, 데이터 격리), 프로필 공유 섹션, 비고란 | Done |
| **Review** | **5인 전문가 코드 리뷰 + Phase 1·2 수정 + 샘플 데이터 제거** | **Done** |

## Database Schema

Supabase (PostgreSQL) 테이블 구성:

| 테이블 | 설명 |
|---|---|
| `profiles` | 사용자 프로필 (닉네임, 아바타, 소개) |
| `trips` | 여행 기록 (상태: planned/completed/wishlist, 날짜, 커버 이미지, 메모) |
| `pins` | 장소 핀 (좌표, 카테고리, 별점, 방문 상태) |
| `pin_photos` | 핀 관련 사진 |
| `expenses` | 경비 내역 (카테고리, 금액) |
| `checklist_items` | 준비 체크리스트 |
| `trip_shares` | 여행 공유/초대 (권한: read/edit, 상태: pending/accepted/declined) |

자세한 스키마는 [docs/DATABASE.md](docs/DATABASE.md) 및 [docs/schema.sql](docs/schema.sql)을 참고하세요.

## Security

- **DB RLS (Row Level Security)**: 모든 테이블에 `auth.uid() = user_id` 정책 적용 — 다른 유저의 데이터 접근 차단
- **애플리케이션 레벨 검증**: 모든 SELECT/UPDATE/DELETE 쿼리에 `user_id` 필터 적용 — RLS 비활성 환경에서도 데이터 격리 보장 (코드 리뷰에서 강화)
- **데이터 격리**: Supabase 모드에서 localStorage 데이터와 DB 데이터 완전 분리 — 계정 전환 시 타 유저 데이터 노출 방지
- **공유 권한**: `trip_shares` 테이블을 통한 read/edit 권한 분리, `owner_id`/`invited_email` 검증 추가, 이메일 기반 + user_id 기반 이중 RLS 정책 (초대 수락 후에만 접근 가능)
- **핀/사진 소유권**: 핀 수정·삭제, 핀 사진 CRUD에 `user_id` 검증 추가 — 타 사용자의 핀/사진 변경 차단
- **Storage 격리**: 사진 경로가 `{user_id}/{trip_id}/{filename}` 구조 — 본인 폴더에만 업로드/삭제 가능
- **OAuth 인증**: Google/Kakao 소셜 로그인으로 비밀번호 저장 없음

## Recent Changes

### Code Review — 5인 전문가 코드 리뷰 & 개선

> 5명의 전문가 에이전트(Backend, Frontend, QA, UI/UX, Service Planner)가 전체 소스코드를 동시 독립 분석한 후, 우선순위별로 개선 작업을 진행했습니다.
> 상세 리포트: [TEAM-REVIEW-DASHBOARD.md](docs/TEAM-REVIEW-DASHBOARD.md) · [PHASE1-REPORT.md](docs/PHASE1-REPORT.md) · [PHASE2-REPORT.md](docs/PHASE2-REPORT.md)

**Phase 1 — 보안 + Critical 버그 (7건)**
- **SEC-1**: `useTrip` 단건 조회에 `user_id` 필터 추가 (타 사용자 데이터 노출 차단)
- **SEC-2**: `updatePin`/`deletePin`에 `.eq('user_id', user.id)` 추가 (타 사용자 핀 변경 차단)
- **SEC-3**: `trip_shares` 쿼리에 `owner_id`/`invited_email` 검증 추가 (공유 권한 우회 차단)
- **SEC-4**: 핀 사진 CRUD에 소유권 검증 로직 추가
- **BUG-1~3**: 체크리스트 정렬 유실, 핀 사진 미표시, 경비 금액 0 저장 등 Critical 버그 수정

**Phase 2 — 안정성 + UX 일관성 (7건)**
- **BUG-6**: 렌더 본문 `setState` → `useEffect` 패턴으로 수정 (TripFormPage, PinFormPage)
- **BUG-7**: 비동기 fetch에 `mountedRef` 패턴 추가 — 언마운트 후 setState 경고 방지 (useTrips, usePins)
- **H-FE-4**: 검색 입력에 250ms 디바운싱 적용 (SearchFilter)
- **H-FE-5**: `pinFilters` 배열 `useMemo` 최적화 (HomePage)
- **H-UX-1**: PinFormPage 전체 네오브루탈리스트 스타일 오버홀
- **H-UX-2**: DashboardPage/ProfilePage 스타일 통일 (네오브루탈리스트)
- **H-UX-3**: 다크모드 입력 필드 일관성 (TripFormPage, SearchFilter)

**샘플 데이터 제거**
- 하드코딩 샘플 여행/핀 데이터 완전 제거 — 사용자 등록 데이터만 표시
- `localStore.ts`에서 샘플 병합 로직 제거, `usePins.ts`에서 `samplePins` 의존성 제거
- Supabase 로그인 사용자: DB 데이터만, 데모 모드: localStorage 데이터만 표시

### Phase 12 — 버그 수정 & 프로필 공유 섹션 & 비고란

**프로필 페이지 공유 섹션 추가**
- 프로필 페이지 하단에 **"공유받은 여행"** 섹션 추가 — 커버 이미지, 제목, 공유자 정보, 권한(읽기/편집) 뱃지 표시
- 공유받은 여행 카드 탭 시 해당 여행 상세 페이지로 바로 이동
- **"내가 공유한 크루"** 섹션 추가 — 공유 대상 이메일, 여행 수, 수락 상태 표시
- `useReceivedShares` 훅 신규 추가 (수락된 공유 목록 + 여행/소유자 정보 조인)

**완료된 여행 비고란**
- 완료된 여행(status=completed)의 일정 편집 시 우선순위 드롭다운(필수/가고싶음/여유되면) 대신 **"비고"** 텍스트 입력으로 전환
- 표시 모드에서도 완료된 여행은 우선순위 뱃지 대신 비고 텍스트 표시

**버그 수정**
- **React error #310 수정** — `useEffect`가 조건부 `return` 이후에 위치하여 렌더링 간 훅 수 불일치 발생 → 모든 훅을 early return 위로 이동
- **사진 업로드 "이미지 로드 실패" 수정** — `URL.createObjectURL` 대신 `FileReader.readAsDataURL` 사용으로 크로스 브라우저 호환성 개선
- **공유 초대 에러 수정** — Supabase `PostgrestError`가 `Error` 인스턴스가 아니어서 실제 에러 메시지가 숨겨지던 문제 → `throw new Error(error.message)` 로 변경
- **이메일 기반 RLS 정책 추가** — `invited_user_id`가 NULL인 pending 초대도 이메일로 조회/수락 가능하도록 RLS 정책 추가 (`002_add_email_based_share_policies.sql`)
- **데이터 격리 수정** — Supabase 모드에서 localStorage 데모 데이터가 DB 결과에 혼합되어 다른 계정으로 로그인 시 이전 계정의 여행이 보이던 문제 수정

### Phase 11 — Supabase Storage & 권한 분리 강화
- Supabase Storage `trip-photos` 버킷으로 실제 사진 업로드 구현
- Storage 파일 경로를 `{user_id}/{trip_id}/{filename}` 구조로 변경하여 유저별 격리
- Storage RLS 정책 추가 (업로드/수정/삭제 시 본인 폴더만 접근 가능)
- 사진 업로드/조회/삭제 시 `auth.getUser()` 검증 추가
- `docs/storage-policy.sql` 추가 (SQL Editor 실행용)

### Phase 10 — 위시리스트 & 버그 수정
- 여행 상태에 '위시' (wishlist) 옵션 추가
- 홈페이지 Quick Stats에 위시리스트 카운트 및 목록 패널 추가
- 데모 모드 저장 실패 수정 (`isDemo` 플래그로 데이터 소스 판별)
- 사진 업로드 시 이미지 압축 (800px/JPEG 70%) 적용

### Phase 9 — UI/UX 개선
- 'Planned' → '정복 예정', 'Completed' → '정복 완료' 라벨 변경
- 지도 마커를 행성 아이콘으로 변경 (방문 상태별 색상 유지)
- Favorite Moments 섹션에 정복 완료된 여행만 표시
- 모달 z-index 오버랩 수정 (지도 필터 위에 모달 표시)
- 상세 페이지 네비게이션 오류 수정 (데모 데이터 폴백)

### Phase 8 — 여행 공유 기능
- 이메일 기반 초대 시스템 (read/edit 권한 선택)
- 초대받은 유저의 수락/거절 플로우
- 홈페이지에 대기 중인 초대 알림 표시
- 공유된 여행에 대한 권한별 접근 제어
- `trip_shares` 테이블 및 RLS 정책 추가

### Phase 7 — 인라인 편집 및 데모 모드 개선
- 상세 페이지 항목별 인라인 편집 (경비, 체크리스트, 장소, 메모, 사진)
- 스탯 카드 클릭 시 해당 섹션 편집 모드 진입
- 빈 섹션에 "탭하여 추가" 플레이스홀더 표시
- 데모 모드 데이터 영속성 수정 (체크리스트 토글, 여행 삭제 등)
- 인라인 사진 업로드/편집 지원

## Deploy

Vercel에 연결하면 `main` 브랜치 push 시 자동 배포됩니다.

Vercel 환경변수 설정:
- `VITE_SUPABASE_URL` — Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public 키

## License

MIT
