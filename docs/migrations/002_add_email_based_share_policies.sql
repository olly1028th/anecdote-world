-- ============================================================
-- Migration 002: 이메일 기반 초대 RLS 정책 추가
-- ============================================================
-- 문제: 기존 RLS 정책은 invited_user_id로만 초대받은 사용자를 식별합니다.
-- 하지만 초대 시 invited_user_id는 NULL일 수 있으며 (미가입 유저),
-- pending 상태에서 이메일로 초대 조회가 불가능합니다.
--
-- 이 마이그레이션은 이메일 기반으로도 초대를 조회/수락할 수 있도록 합니다.
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1) 이메일 기반 초대 조회 (pending 포함 모든 상태)
CREATE POLICY "Invited users can view shares by email"
  ON public.trip_shares FOR SELECT USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 2) 이메일 기반 초대 수락/거절
CREATE POLICY "Invited users can accept/decline by email"
  ON public.trip_shares FOR UPDATE USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
