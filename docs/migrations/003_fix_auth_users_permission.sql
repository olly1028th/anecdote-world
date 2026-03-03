-- ============================================================
-- Migration 003: auth.users 직접 접근 제거 (permission denied 수정)
-- ============================================================
-- 문제: migration 002의 이메일 기반 RLS 정책이 auth.users 테이블을
-- 직접 SELECT하여 "permission denied for table users" 에러 발생.
-- authenticated 역할은 auth.users에 SELECT 권한이 없으므로,
-- trip INSERT 시 SELECT 정책 평가 체인에서 실패.
--
-- 수정: SECURITY DEFINER 함수로 현재 사용자 이메일을 안전하게 조회,
-- RLS 정책에서 auth.users 직접 참조 제거.
--
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1) 현재 인증된 사용자의 이메일을 반환하는 보안 함수
-- SECURITY DEFINER로 auth.users 접근 권한 문제 우회
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 함수 접근 권한 설정
REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

-- 2) 기존 이메일 기반 RLS 정책 삭제 (auth.users 직접 참조하는 정책)
DROP POLICY IF EXISTS "Invited users can view shares by email" ON public.trip_shares;
DROP POLICY IF EXISTS "Invited users can accept/decline by email" ON public.trip_shares;

-- 3) SECURITY DEFINER 함수를 사용하는 새 정책 생성
CREATE POLICY "Invited users can view shares by email"
  ON public.trip_shares FOR SELECT USING (
    invited_email = public.current_user_email()
  );

CREATE POLICY "Invited users can accept/decline by email"
  ON public.trip_shares FOR UPDATE USING (
    invited_email = public.current_user_email()
  );
