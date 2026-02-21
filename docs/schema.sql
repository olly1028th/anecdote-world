-- ============================================================
-- Anecdote World - Database Schema (Supabase / PostgreSQL)
-- ============================================================
-- 설계 원칙:
--   1. pins(핀)이 핵심 엔티티 — 지도 위 모든 마커
--   2. trips(여행)는 핀들을 묶는 그룹 (선택적)
--   3. 핀은 독립적으로도 존재 가능 (위시리스트 핀 등)
--   4. Row Level Security(RLS)로 유저별 데이터 격리
-- ============================================================

-- ========================
-- 0. Extensions
-- ========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- 지리 좌표 연산용


-- ========================
-- 1. users (유저)
-- ========================
-- Supabase Auth가 auth.users를 자동 생성하므로,
-- 여기서는 프로필 정보만 별도 관리
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT DEFAULT '',
  bio         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auth.users 생성 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', '여행자'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ========================
-- 2. trips (여행)
-- ========================
-- 여러 핀을 하나의 여행으로 묶는 그룹
CREATE TABLE public.trips (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,                    -- "도쿄 벚꽃 여행"
  status      TEXT NOT NULL DEFAULT 'planned'   -- 'planned' | 'completed'
                CHECK (status IN ('planned', 'completed')),
  start_date  DATE,
  end_date    DATE,
  cover_image TEXT DEFAULT '',                  -- 대표 이미지 URL
  memo        TEXT DEFAULT '',                  -- 한줄 후기 / 메모
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_user ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(user_id, status);


-- ========================
-- 3. pins (핀) ★ 핵심 테이블
-- ========================
-- 지도 위 모든 마커. trip에 속할 수도, 독립적일 수도 있음.
CREATE TABLE public.pins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id     UUID REFERENCES public.trips(id) ON DELETE SET NULL,  -- NULL이면 독립 핀

  -- 위치 정보
  name        TEXT NOT NULL,                    -- "센소지", "콜로세움"
  address     TEXT DEFAULT '',                  -- 상세 주소
  lat         DOUBLE PRECISION NOT NULL,        -- 위도  (35.7147)
  lng         DOUBLE PRECISION NOT NULL,        -- 경도 (139.7967)
  country     TEXT DEFAULT '',                  -- "일본"
  city        TEXT DEFAULT '',                  -- "도쿄"

  -- 방문 상태
  visit_status TEXT NOT NULL DEFAULT 'wishlist'  -- 'visited' | 'planned' | 'wishlist'
                CHECK (visit_status IN ('visited', 'planned', 'wishlist')),
  visited_at   DATE,                            -- 실제 방문일 (visited일 때)

  -- 상세 정보
  category    TEXT DEFAULT 'other'              -- 'food' | 'cafe' | 'landmark' | 'hotel'
                CHECK (category IN (             --   | 'nature' | 'shopping' | 'activity' | 'other'
                  'food', 'cafe', 'landmark', 'hotel',
                  'nature', 'shopping', 'activity', 'other'
                )),
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),  -- 별점 (1~5, visited만)
  note        TEXT DEFAULT '',                  -- 자유 메모
  day_number  SMALLINT,                         -- 여행 n일차 (trip에 속할 때)

  -- 정렬
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pins_user ON public.pins(user_id);
CREATE INDEX idx_pins_trip ON public.pins(trip_id);
CREATE INDEX idx_pins_visit ON public.pins(user_id, visit_status);
CREATE INDEX idx_pins_coords ON public.pins(lat, lng);


-- ========================
-- 4. pin_photos (핀 사진)
-- ========================
CREATE TABLE public.pin_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_id      UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,                    -- Supabase Storage URL
  caption     TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pin_photos_pin ON public.pin_photos(pin_id);


-- ========================
-- 5. expenses (경비)
-- ========================
-- trip 단위 또는 pin 단위로 기록 가능
CREATE TABLE public.expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id     UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  pin_id      UUID REFERENCES public.pins(id) ON DELETE SET NULL,  -- 특정 핀에 연결 (선택)
  category    TEXT NOT NULL DEFAULT 'other'
                CHECK (category IN (
                  'flight', 'hotel', 'food', 'transport',
                  'activity', 'shopping', 'other'
                )),
  amount      INTEGER NOT NULL,                 -- 금액 (원 단위)
  currency    TEXT NOT NULL DEFAULT 'KRW',       -- 통화 코드
  label       TEXT DEFAULT '',                  -- "인천-나리타 왕복"
  spent_at    DATE,                             -- 지출일
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX idx_expenses_pin ON public.expenses(pin_id);


-- ========================
-- 6. checklist_items (체크리스트)
-- ========================
CREATE TABLE public.checklist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,                    -- "여권 유효기간 확인"
  checked     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_trip ON public.checklist_items(trip_id);


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- 모든 테이블에 RLS 활성화: 본인 데이터만 CRUD 가능

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 읽기/수정
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- trips: 본인만 CRUD
CREATE POLICY "Users can CRUD own trips"
  ON public.trips FOR ALL USING (auth.uid() = user_id);

-- pins: 본인만 CRUD
CREATE POLICY "Users can CRUD own pins"
  ON public.pins FOR ALL USING (auth.uid() = user_id);

-- pin_photos: 본인만 CRUD
CREATE POLICY "Users can CRUD own pin photos"
  ON public.pin_photos FOR ALL USING (auth.uid() = user_id);

-- expenses: 본인만 CRUD
CREATE POLICY "Users can CRUD own expenses"
  ON public.expenses FOR ALL USING (auth.uid() = user_id);

-- checklist_items: 본인만 CRUD
CREATE POLICY "Users can CRUD own checklists"
  ON public.checklist_items FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
