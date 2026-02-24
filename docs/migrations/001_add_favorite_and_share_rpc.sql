-- ============================================================
-- Migration 001: is_favorite 컬럼 추가 + get_user_id_by_email RPC
-- ============================================================
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1) pin_photos에 is_favorite 컬럼 추가
ALTER TABLE public.pin_photos
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- favorite 사진 조회 성능용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_pin_photos_favorite
  ON public.pin_photos(user_id) WHERE is_favorite = true;

-- 2) 이메일로 유저 ID 조회 RPC 함수
--    (trip_shares 초대 시 가입 유저 자동 매칭에 사용)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE auth.users.email = get_user_id_by_email.email LIMIT 1;
$$;

-- 함수 실행 권한: 인증된 유저만
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
