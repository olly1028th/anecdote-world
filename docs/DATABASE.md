# Anecdote World - 데이터베이스 설계

## 기술 스택

| 역할 | 선택 | 이유 |
|------|------|------|
| **DB** | Supabase (PostgreSQL) | 무료 티어 500MB, RLS로 보안, 실시간 구독 |
| **Auth** | Supabase Auth | 소셜 로그인(Google/Kakao) 내장, JWT 자동 발급 |
| **Storage** | Supabase Storage | 여행 사진 저장, Auth 연동 접근 제어 |
| **API** | Supabase JS Client | REST/실시간 자동 생성, 별도 서버 불필요 |
| **호스팅** | Vercel | React SPA 배포, 글로벌 CDN, 무료 |

> **서버리스로 충분한 이유**: 개인용 여행 트래커는 동시 접속이 낮고, 복잡한 서버 로직이 없음.
> Supabase가 DB + Auth + Storage + API를 모두 제공하므로 별도 백엔드 서버가 필요 없음.

---

## 테이블 구조 (ER 다이어그램)

```
┌──────────────┐
│   profiles   │  ← Supabase Auth 연동 (유저 프로필)
│──────────────│
│ id (PK/FK)   │──────────────────────────────────────────┐
│ nickname     │                                          │
│ avatar_url   │                                          │
│ bio          │                                          │
│ created_at   │                                          │
│ updated_at   │                                          │
└──────────────┘                                          │
       │                                                  │
       │ 1:N                                              │
       ▼                                                  │
┌──────────────┐        ┌──────────────┐                  │
│    trips     │ 1:N    │    pins      │ ★ 핵심           │
│──────────────│───────▶│──────────────│                  │
│ id (PK)      │        │ id (PK)      │                  │
│ user_id (FK) │        │ user_id (FK) │◀─────────────────┘
│ title        │        │ trip_id (FK) │  ← NULL 가능 (독립 핀)
│ status       │        │              │
│ start_date   │        │ name         │  "센소지"
│ end_date     │        │ lat / lng    │  35.71 / 139.79
│ cover_image  │        │ country/city │  "일본" / "도쿄"
│ memo         │        │              │
│ created_at   │        │ visit_status │  visited|planned|wishlist
│ updated_at   │        │ visited_at   │  실제 방문일
└──────────────┘        │ category     │  food|landmark|...
       │                │ rating       │  1~5 별점
       │                │ note         │  자유 메모
       │                │ day_number   │  여행 n일차
       │                │ sort_order   │
       │                │ created_at   │
       │                │ updated_at   │
       │                └──────────────┘
       │                       │ 1:N
       │                       ▼
       │                ┌──────────────┐
       │                │  pin_photos  │
       │                │──────────────│
       │                │ id (PK)      │
       │                │ pin_id (FK)  │
       │                │ user_id (FK) │
       │                │ url          │  Storage URL
       │                │ caption      │
       │                │ sort_order   │
       │                │ created_at   │
       │                └──────────────┘
       │
       │ 1:N                           1:N
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌──────────────┐  ┌────────────────┐  (pins에도 연결 가능)
│   expenses   │  │checklist_items │
│──────────────│  │────────────────│
│ id (PK)      │  │ id (PK)        │
│ user_id (FK) │  │ user_id (FK)   │
│ trip_id (FK) │  │ trip_id (FK)   │
│ pin_id (FK)  │  │ text           │
│ category     │  │ checked        │
│ amount       │  │ sort_order     │
│ currency     │  │ created_at     │
│ label        │  └────────────────┘
│ spent_at     │
│ created_at   │
└──────────────┘
```

---

## 테이블별 상세 설명

### 1. `profiles` — 유저 프로필

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | `auth.users.id`와 동일, 자동 생성 |
| `nickname` | TEXT | 표시 이름 ("여행자" 기본값) |
| `avatar_url` | TEXT | 프로필 사진 URL |
| `bio` | TEXT | 한줄 자기소개 |

- Supabase Auth에서 회원가입 시 트리거로 자동 생성
- 소셜 로그인(Google/Kakao) 이름을 nickname으로 자동 설정

---

### 2. `trips` — 여행

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 자동 생성 |
| `user_id` | UUID (FK) | 소유자 |
| `title` | TEXT | "도쿄 벚꽃 여행" |
| `status` | TEXT | `planned` 또는 `completed` |
| `start_date` | DATE | 출발일 |
| `end_date` | DATE | 귀국일 |
| `cover_image` | TEXT | 대표 이미지 URL |
| `memo` | TEXT | 한줄 후기 |

- 핀(pins)들을 묶는 상위 그룹
- 하나의 여행에 여러 도시/장소 핀이 연결됨

---

### 3. `pins` — 지도 핀 (핵심)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | 자동 생성 |
| `user_id` | UUID (FK) | 소유자 |
| `trip_id` | UUID (FK, nullable) | 속한 여행 (NULL = 독립 핀) |
| `name` | TEXT | "센소지", "콜로세움" |
| `lat` / `lng` | DOUBLE | 위도/경도 |
| `country` / `city` | TEXT | "일본" / "도쿄" |
| `visit_status` | TEXT | **visited** / **planned** / **wishlist** |
| `visited_at` | DATE | 실제 방문일 |
| `category` | TEXT | food, cafe, landmark, hotel, nature, shopping, activity, other |
| `rating` | SMALLINT | 별점 1~5 (방문한 곳만) |
| `note` | TEXT | 자유 메모 |
| `day_number` | SMALLINT | 여행 몇 일차 |

**핀의 3가지 상태:**
```
visited   → 이미 다녀온 곳 (별점, 후기, 사진 있음)
planned   → 여행 계획에 포함된 곳 (trip에 연결)
wishlist  → 언젠가 가고 싶은 곳 (독립 핀)
```

**핀이 독립적일 수 있는 이유:**
- "언젠가 가보고 싶은 곳"을 trip 없이 지도에 찍어둘 수 있음
- 나중에 trip을 만들면 해당 핀을 trip에 연결

---

### 4. `pin_photos` — 핀별 사진

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `pin_id` | UUID (FK) | 어떤 핀의 사진인지 |
| `url` | TEXT | Supabase Storage 경로 |
| `caption` | TEXT | 사진 설명 |

---

### 5. `expenses` — 경비

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `trip_id` | UUID (FK) | 여행 단위 경비 |
| `pin_id` | UUID (FK, nullable) | 특정 장소에서의 지출 |
| `category` | TEXT | flight, hotel, food, transport, activity, shopping, other |
| `amount` | INTEGER | 금액 (원 단위) |
| `currency` | TEXT | 통화 코드 (KRW, JPY, USD...) |
| `label` | TEXT | "인천-나리타 왕복" |
| `spent_at` | DATE | 지출일 |

---

### 6. `checklist_items` — 준비 체크리스트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `trip_id` | UUID (FK) | 어떤 여행의 체크리스트인지 |
| `text` | TEXT | "여권 유효기간 확인" |
| `checked` | BOOLEAN | 완료 여부 |
| `sort_order` | INTEGER | 정렬 순서 |

---

## 보안: Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 **본인 데이터만** 접근 가능:

```sql
-- 예시: pins 테이블
CREATE POLICY "Users can CRUD own pins"
  ON public.pins FOR ALL
  USING (auth.uid() = user_id);
```

→ 로그인한 유저의 JWT에서 `auth.uid()`를 추출해서 `user_id`와 비교
→ 다른 유저의 핀은 아예 보이지 않음

---

## 핵심 쿼리 예시

### 세계 지도에 내 핀 모두 표시
```sql
SELECT id, name, lat, lng, visit_status, category, rating
FROM pins
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### 특정 여행의 일정순 핀 + 경비
```sql
SELECT p.*, COALESCE(SUM(e.amount), 0) as total_spent
FROM pins p
LEFT JOIN expenses e ON e.pin_id = p.id
WHERE p.trip_id = '여행ID'
GROUP BY p.id
ORDER BY p.day_number, p.sort_order;
```

### 나라별 방문 통계
```sql
SELECT country, COUNT(*) as pin_count
FROM pins
WHERE user_id = auth.uid() AND visit_status = 'visited'
GROUP BY country
ORDER BY pin_count DESC;
```

### 위시리스트 (아직 여행에 안 묶인 핀)
```sql
SELECT * FROM pins
WHERE user_id = auth.uid()
  AND visit_status = 'wishlist'
  AND trip_id IS NULL
ORDER BY created_at DESC;
```

---

## 프론트엔드 연동 (Supabase JS)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 내 핀 전부 가져오기 (RLS가 자동으로 본인 것만 필터)
const { data: pins } = await supabase
  .from('pins')
  .select('*')
  .order('created_at', { ascending: false });

// 핀 추가
await supabase.from('pins').insert({
  name: '센소지',
  lat: 35.7148,
  lng: 139.7967,
  country: '일본',
  city: '도쿄',
  visit_status: 'visited',
  category: 'landmark',
  rating: 5,
  note: '아사쿠사의 상징, 야경이 특히 아름다움',
});

// 핀 사진 업로드
const { data } = await supabase.storage
  .from('pin-photos')
  .upload(`${userId}/${pinId}/photo1.jpg`, file);
```
