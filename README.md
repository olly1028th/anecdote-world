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
- **추천 장소** — must / want / maybe 우선순위 태그 (인라인 추가/삭제)
- **여행 공유** — 이메일로 다른 유저 초대, 수락/거절, read/edit 권한 관리
- **Favorite Moments** — 정복 완료된 여행만 카드로 표시
- **국기 Fallback** — 커버 이미지 없는 여행에 해당 국가 국기를 자동 표시 (flagcdn.com)
- **OAuth 인증** — Google · Kakao 소셜 로그인 (Supabase Auth)
- **데모 모드** — Supabase 없이도 샘플 데이터로 전체 기능 체험, 추가한 데이터는 localStorage에 영구 보관
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
│       └── PinMarker.tsx    # 상태별 색상 마커
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
│   └── sampleData.ts        # 데모 모드 샘플 데이터
├── lib/
│   ├── supabase.ts          # Supabase 클라이언트
│   └── storage.ts           # Supabase Storage (사진 업로드/삭제, user_id 기반 경로)
├── App.tsx                  # 라우팅 (Layout Route 패턴)
├── main.tsx
└── index.css

docs/
├── DATABASE.md              # DB 스키마 문서
├── schema.sql               # PostgreSQL DDL (테이블 + RLS 정책)
├── storage-policy.sql       # Supabase Storage RLS 정책
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

> 환경 변수 없이도 **데모 모드**로 앱을 사용할 수 있습니다. 샘플 여행 데이터와 핀이 자동으로 표시되며, 추가한 데이터는 localStorage에 영구 보관됩니다.

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
- **공유 권한**: `trip_shares` 테이블을 통한 read/edit 권한 분리 (초대 수락 후에만 접근 가능)
- **Storage 격리**: 사진 경로가 `{user_id}/{trip_id}/{filename}` 구조 — 본인 폴더에만 업로드/삭제 가능
- **OAuth 인증**: Google/Kakao 소셜 로그인으로 비밀번호 저장 없음

## Recent Changes

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
