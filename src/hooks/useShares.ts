import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SharePermission, ShareStatus, TripShare } from '../types/database';

// ---- 데모 모드 로컬 저장소 ----

const DEMO_SHARES_KEY = 'anecdote-demo-shares';

interface DemoShare {
  id: string;
  trip_id: string;
  owner_id: string;
  invited_email: string;
  invited_user_id: string | null;
  permission: SharePermission;
  status: ShareStatus;
  created_at: string;
  updated_at: string;
  // 데모 UI용 추가 필드
  trip_title?: string;
  owner_nickname?: string;
}

function loadDemoShares(): DemoShare[] {
  try {
    const raw = localStorage.getItem(DEMO_SHARES_KEY);
    return raw ? (JSON.parse(raw) as DemoShare[]) : [];
  } catch {
    return [];
  }
}

function saveDemoShares(shares: DemoShare[]) {
  localStorage.setItem(DEMO_SHARES_KEY, JSON.stringify(shares));
}

// ---- 여행 공유 목록 (여행 소유자용) ----

export function useSharesForTrip(tripId: string | undefined) {
  const [shares, setShares] = useState<TripShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!tripId) return;

    if (!isSupabaseConfigured) {
      const all = loadDemoShares();
      setShares(all.filter((s) => s.trip_id === tripId));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setShares((data as TripShare[]) ?? []);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('share-updated', handler);
    return () => window.removeEventListener('share-updated', handler);
  }, [refetch]);

  return { shares, loading, refetch };
}

// ---- 받은 초대 목록 (초대받은 유저용) ----

export function usePendingInvitations(userEmail: string | undefined) {
  const [invitations, setInvitations] = useState<DemoShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const all = loadDemoShares();
      setInvitations(all.filter((s) => s.invited_email === userEmail && s.status === 'pending'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*, trips(title), profiles!trip_shares_owner_id_fkey(nickname)')
        .eq('invited_email', userEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations((data as DemoShare[]) ?? []);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('share-updated', handler);
    return () => window.removeEventListener('share-updated', handler);
  }, [refetch]);

  return { invitations, loading, refetch };
}

// ---- 초대 보내기 ----

export async function createShare(
  tripId: string,
  ownerId: string,
  invitedEmail: string,
  permission: SharePermission,
  tripTitle?: string,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    // 중복 체크
    const exists = all.find(
      (s) => s.trip_id === tripId && s.invited_email === invitedEmail && s.status !== 'declined',
    );
    if (exists) throw new Error('이미 초대된 이메일입니다.');

    const share: DemoShare = {
      id: `share-${Date.now()}`,
      trip_id: tripId,
      owner_id: ownerId,
      invited_email: invitedEmail,
      invited_user_id: null,
      permission,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trip_title: tripTitle,
      owner_nickname: '여행자',
    };
    saveDemoShares([share, ...all]);
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  // Supabase: 초대받는 유저가 이미 가입했는지 확인
  let invitedUserId: string | null = null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (
      await supabase.rpc('get_user_id_by_email', { email: invitedEmail })
    ).data)
    .single();
  if (profile) invitedUserId = profile.id;

  const { error } = await supabase.from('trip_shares').insert({
    trip_id: tripId,
    owner_id: ownerId,
    invited_email: invitedEmail,
    invited_user_id: invitedUserId,
    permission,
  });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 초대 수락 ----

export async function acceptShare(shareId: string, userId?: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId
        ? { ...s, status: 'accepted' as ShareStatus, invited_user_id: userId ?? 'demo-user-001', updated_at: new Date().toISOString() }
        : s,
    );
    saveDemoShares(updated);
    window.dispatchEvent(new CustomEvent('share-updated'));
    window.dispatchEvent(new CustomEvent('trip-added'));
    return;
  }

  const { error } = await supabase
    .from('trip_shares')
    .update({ status: 'accepted', invited_user_id: userId })
    .eq('id', shareId);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('share-updated'));
  window.dispatchEvent(new CustomEvent('trip-added'));
}

// ---- 초대 거절 ----

export async function declineShare(shareId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId
        ? { ...s, status: 'declined' as ShareStatus, updated_at: new Date().toISOString() }
        : s,
    );
    saveDemoShares(updated);
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  const { error } = await supabase
    .from('trip_shares')
    .update({ status: 'declined' })
    .eq('id', shareId);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 공유 삭제 (소유자가 취소) ----

export async function removeShare(shareId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => s.id !== shareId));
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  const { error } = await supabase.from('trip_shares').delete().eq('id', shareId);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 권한 변경 ----

export async function updateSharePermission(shareId: string, permission: SharePermission): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId ? { ...s, permission, updated_at: new Date().toISOString() } : s,
    );
    saveDemoShares(updated);
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  const { error } = await supabase
    .from('trip_shares')
    .update({ permission })
    .eq('id', shareId);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 특정 여행에 대한 내 권한 조회 ----

export function useMyPermission(tripId: string | undefined, userEmail: string | undefined) {
  const [permission, setPermission] = useState<'owner' | SharePermission | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!tripId || !userEmail) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const all = loadDemoShares();
      const share = all.find(
        (s) => s.trip_id === tripId && s.invited_email === userEmail && s.status === 'accepted',
      );
      setPermission(share ? share.permission : null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_shares')
        .select('permission')
        .eq('trip_id', tripId)
        .eq('invited_email', userEmail)
        .eq('status', 'accepted')
        .single();
      if (error || !data) {
        setPermission(null);
      } else {
        setPermission(data.permission as SharePermission);
      }
    } catch {
      setPermission(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, userEmail]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { permission, loading };
}
