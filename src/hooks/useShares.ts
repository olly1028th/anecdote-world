import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendShareInvitationEmail } from '../lib/email';
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

    // 데모 여행(demo- prefix / 숫자 ID) 또는 Supabase 미설정 시 로컬 데모 저장소 사용
    const isDemoTrip = tripId.startsWith('demo-') || /^\d+$/.test(tripId);
    if (!isSupabaseConfigured || isDemoTrip) {
      const all = loadDemoShares();
      setShares(all.filter((s) => s.trip_id === tripId) as unknown as TripShare[]);
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
      if (error) throw new Error(error.message);
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
      if (error) throw new Error(error.message);
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

// ---- 데모 여행 전용 초대 (isSupabaseConfigured 무관) ----

export function createDemoShareDirect(
  tripId: string,
  ownerId: string,
  invitedEmail: string,
  permission: SharePermission,
  tripTitle?: string,
): void {
  const all = loadDemoShares();
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
}

// ---- 소유자 닉네임 조회 ----

async function getOwnerNickname(ownerId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', ownerId)
      .single();
    return data?.nickname || '여행자';
  } catch {
    return '여행자';
  }
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
  try {
    const { data: userId } = await supabase.rpc('get_user_id_by_email', { email: invitedEmail });
    if (userId) invitedUserId = userId;
  } catch {
    // 미가입 유저 — invited_user_id = null로 진행 (이메일 기반 초대)
  }

  try {
    // 중복 체크
    const { data: existing } = await supabase
      .from('trip_shares')
      .select('id')
      .eq('trip_id', tripId)
      .eq('invited_email', invitedEmail)
      .neq('status', 'declined')
      .maybeSingle();
    if (existing) throw new Error('이미 초대된 이메일입니다.');

    const { error } = await supabase.from('trip_shares').insert({
      trip_id: tripId,
      owner_id: ownerId,
      invited_email: invitedEmail,
      invited_user_id: invitedUserId,
      permission,
    });
    if (error) throw new Error(error.message);
    window.dispatchEvent(new CustomEvent('share-updated'));

    // 이메일 알림 발송 (비동기, 실패해도 공유는 정상)
    const ownerNickname = await getOwnerNickname(ownerId);
    sendShareInvitationEmail({
      invitedEmail,
      tripTitle: tripTitle || '여행',
      ownerNickname,
    });
  } catch (err) {
    // trip_shares 테이블 미존재 등 Supabase 실패 시 로컬 fallback
    if (err instanceof Error && err.message === '이미 초대된 이메일입니다.') throw err;
    console.error('[createShare] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    const exists = all.find(
      (s) => s.trip_id === tripId && s.invited_email === invitedEmail && s.status !== 'declined',
    );
    if (exists) throw new Error('이미 초대된 이메일입니다.');
    const share: DemoShare = {
      id: `share-${Date.now()}`,
      trip_id: tripId,
      owner_id: ownerId,
      invited_email: invitedEmail,
      invited_user_id: invitedUserId,
      permission,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trip_title: tripTitle,
      owner_nickname: '여행자',
    };
    saveDemoShares([share, ...all]);
    window.dispatchEvent(new CustomEvent('share-updated'));
  }
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

  // 초대받은 본인만 수락 가능
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  try {
    const { error } = await supabase
      .from('trip_shares')
      .update({ status: 'accepted', invited_user_id: userId ?? user.id })
      .eq('id', shareId)
      .eq('invited_email', user.email ?? '');
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[acceptShare] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId
        ? { ...s, status: 'accepted' as ShareStatus, invited_user_id: userId ?? user.id, updated_at: new Date().toISOString() }
        : s,
    );
    saveDemoShares(updated);
  }
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

  // 초대받은 본인만 거절 가능
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  try {
    const { error } = await supabase
      .from('trip_shares')
      .update({ status: 'declined' })
      .eq('id', shareId)
      .eq('invited_email', user.email ?? '');
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[declineShare] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId
        ? { ...s, status: 'declined' as ShareStatus, updated_at: new Date().toISOString() }
        : s,
    );
    saveDemoShares(updated);
  }
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 공유 삭제 (소유자가 취소) ----

export async function removeShare(shareId: string): Promise<void> {
  // 데모 share ID 또는 Supabase 미설정 시 로컬 처리
  if (!isSupabaseConfigured || shareId.startsWith('share-')) {
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => s.id !== shareId));
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  // 소유자만 삭제 가능
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  try {
    const { error } = await supabase.from('trip_shares').delete().eq('id', shareId).eq('owner_id', user.id);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[removeShare] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => s.id !== shareId));
  }
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 공유 해제 (수신자가 공유 떠나기) ----

export async function leaveShare(ownerId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    const { data: { user } } = { data: { user: { id: 'demo-user-001', email: '' } } };
    saveDemoShares(all.filter((s) => !(s.owner_id === ownerId && (s.invited_user_id === user.id || s.status === 'accepted'))));
    window.dispatchEvent(new CustomEvent('share-updated'));
    window.dispatchEvent(new CustomEvent('trip-added'));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');

  try {
    // 해당 소유자로부터 받은 모든 공유를 삭제
    const { error } = await supabase
      .from('trip_shares')
      .delete()
      .eq('owner_id', ownerId)
      .or(`invited_user_id.eq.${user.id},invited_email.eq.${user.email ?? ''}`);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[leaveShare] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => !(s.owner_id === ownerId && (s.invited_user_id === user.id || s.invited_email === user.email))));
  }
  window.dispatchEvent(new CustomEvent('share-updated'));
  window.dispatchEvent(new CustomEvent('trip-added'));
}

// ---- 권한 변경 ----

export async function updateSharePermission(shareId: string, permission: SharePermission): Promise<void> {
  // 데모 share ID 또는 Supabase 미설정 시 로컬 처리
  if (!isSupabaseConfigured || shareId.startsWith('share-')) {
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId ? { ...s, permission, updated_at: new Date().toISOString() } : s,
    );
    saveDemoShares(updated);
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  // 소유자만 권한 변경 가능
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다');
  try {
    const { error } = await supabase
      .from('trip_shares')
      .update({ permission })
      .eq('id', shareId)
      .eq('owner_id', user.id);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[updateSharePermission] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    const updated = all.map((s) =>
      s.id === shareId ? { ...s, permission, updated_at: new Date().toISOString() } : s,
    );
    saveDemoShares(updated);
  }
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 전체 여행 일괄 공유 ----

export async function shareAllTrips(
  ownerId: string,
  tripIds: string[],
  invitedEmail: string,
  permission: SharePermission,
  tripTitles?: Map<string, string>,
): Promise<number> {
  if (tripIds.length === 0) return 0;

  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    const now = new Date().toISOString();
    const newShares: DemoShare[] = [];
    let added = 0;

    for (const tripId of tripIds) {
      const exists = all.find(
        (s) => s.trip_id === tripId && s.invited_email === invitedEmail && s.status !== 'declined',
      );
      if (!exists) {
        newShares.push({
          id: `share-${Date.now()}-${added}`,
          trip_id: tripId,
          owner_id: ownerId,
          invited_email: invitedEmail,
          invited_user_id: null,
          permission,
          status: 'pending',
          created_at: now,
          updated_at: now,
          trip_title: tripTitles?.get(tripId),
          owner_nickname: '여행자',
        });
        added++;
      }
    }

    if (added > 0) {
      saveDemoShares([...newShares, ...all]);
    }
    window.dispatchEvent(new CustomEvent('share-updated'));
    return added;
  }

  // Supabase: 초대받는 유저 확인
  let invitedUserId: string | null = null;
  try {
    const { data: userId } = await supabase.rpc('get_user_id_by_email', { email: invitedEmail });
    if (userId) invitedUserId = userId;
  } catch { /* 미가입 유저 */ }

  try {
    // 이미 공유된 여행 확인
    const { data: existingShares } = await supabase
      .from('trip_shares')
      .select('trip_id')
      .eq('owner_id', ownerId)
      .eq('invited_email', invitedEmail)
      .neq('status', 'declined');

    const existingTripIds = new Set((existingShares ?? []).map((s: { trip_id: string }) => s.trip_id));
    const newTripIds = tripIds.filter((id) => !existingTripIds.has(id));

    if (newTripIds.length > 0) {
      const { error } = await supabase.from('trip_shares').insert(
        newTripIds.map((tripId) => ({
          trip_id: tripId,
          owner_id: ownerId,
          invited_email: invitedEmail,
          invited_user_id: invitedUserId,
          permission,
        })),
      );
      if (error) throw new Error(error.message);
    }

    window.dispatchEvent(new CustomEvent('share-updated'));

    // 새로 공유된 여행이 있으면 이메일 알림 발송
    if (newTripIds.length > 0) {
      const ownerNickname = await getOwnerNickname(ownerId);
      sendShareInvitationEmail({
        invitedEmail,
        tripTitle: newTripIds.length === 1
          ? (tripTitles?.get(newTripIds[0]) || '여행')
          : `${tripTitles?.get(newTripIds[0]) || '여행'} 외 ${newTripIds.length - 1}개`,
        ownerNickname,
      });
    }

    return newTripIds.length;
  } catch (err) {
    // trip_shares 테이블 미존재 등 Supabase 실패 시 로컬 fallback
    console.error('[shareAllTrips] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    const now = new Date().toISOString();
    const newShares: DemoShare[] = [];
    let added = 0;

    for (const tripId of tripIds) {
      const exists = all.find(
        (s) => s.trip_id === tripId && s.invited_email === invitedEmail && s.status !== 'declined',
      );
      if (!exists) {
        newShares.push({
          id: `share-${Date.now()}-${added}`,
          trip_id: tripId,
          owner_id: ownerId,
          invited_email: invitedEmail,
          invited_user_id: invitedUserId,
          permission,
          status: 'pending',
          created_at: now,
          updated_at: now,
          trip_title: tripTitles?.get(tripId),
          owner_nickname: '여행자',
        });
        added++;
      }
    }

    if (added > 0) {
      saveDemoShares([...newShares, ...all]);
    }
    window.dispatchEvent(new CustomEvent('share-updated'));
    return added;
  }
}

// ---- 전체 공유 취소 ----

export async function revokeAllShares(ownerId: string, invitedEmail: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => !(s.owner_id === ownerId && s.invited_email === invitedEmail)));
    window.dispatchEvent(new CustomEvent('share-updated'));
    return;
  }

  try {
    const { error } = await supabase
      .from('trip_shares')
      .delete()
      .eq('owner_id', ownerId)
      .eq('invited_email', invitedEmail);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[revokeAllShares] Supabase 실패, 로컬 fallback:', err);
    const all = loadDemoShares();
    saveDemoShares(all.filter((s) => !(s.owner_id === ownerId && s.invited_email === invitedEmail)));
  }
  window.dispatchEvent(new CustomEvent('share-updated'));
}

// ---- 공유된 사용자 목록 (소유자용) ----

export interface SharedUser {
  email: string;
  permission: SharePermission;
  status: ShareStatus;
  tripCount: number;
}

export function useSharedUsers(ownerId: string | undefined) {
  const [users, setUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const all = loadDemoShares();
      const ownerShares = all.filter((s) => s.owner_id === ownerId);
      const emailMap = new Map<string, SharedUser>();
      for (const s of ownerShares) {
        const existing = emailMap.get(s.invited_email);
        if (!existing) {
          emailMap.set(s.invited_email, {
            email: s.invited_email,
            permission: s.permission,
            status: s.status,
            tripCount: 1,
          });
        } else {
          existing.tripCount++;
          if (s.status === 'accepted') existing.status = 'accepted';
          if (s.permission === 'edit') existing.permission = 'edit';
        }
      }
      setUsers([...emailMap.values()]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_shares')
        .select('invited_email, permission, status')
        .eq('owner_id', ownerId);
      if (error) throw new Error(error.message);

      const emailMap = new Map<string, SharedUser>();
      for (const s of (data ?? [])) {
        const existing = emailMap.get(s.invited_email);
        if (!existing) {
          emailMap.set(s.invited_email, {
            email: s.invited_email,
            permission: s.permission as SharePermission,
            status: s.status as ShareStatus,
            tripCount: 1,
          });
        } else {
          existing.tripCount++;
          if (s.status === 'accepted') existing.status = 'accepted' as ShareStatus;
          if (s.permission === 'edit') existing.permission = 'edit' as SharePermission;
        }
      }
      setUsers([...emailMap.values()]);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('share-updated', handler);
    return () => window.removeEventListener('share-updated', handler);
  }, [refetch]);

  return { users, loading, refetch };
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

// ---- 공유받은 여행 목록 (프로필 페이지용) ----

export interface ReceivedShare {
  id: string;
  trip_id: string;
  owner_id: string;
  permission: SharePermission;
  status: ShareStatus;
  created_at: string;
  trip_title: string;
  trip_destination: string;
  trip_cover: string;
  trip_status: string;
  trip_start_date: string;
  owner_nickname: string;
}

export function useReceivedShares(userEmail: string | undefined) {
  const [shares, setShares] = useState<ReceivedShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const all = loadDemoShares();
      const received = all
        .filter((s) => s.invited_email === userEmail && s.status === 'accepted')
        .map((s) => ({
          id: s.id,
          trip_id: s.trip_id,
          owner_id: s.owner_id,
          permission: s.permission,
          status: s.status,
          created_at: s.created_at,
          trip_title: s.trip_title || '여행',
          trip_destination: '',
          trip_cover: '',
          trip_status: 'planned',
          trip_start_date: '',
          owner_nickname: s.owner_nickname || '사용자',
        }));
      setShares(received);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_shares')
        .select('id, trip_id, owner_id, permission, status, created_at, trips(title, destination, cover_image, status, start_date), profiles!trip_shares_owner_id_fkey(nickname)')
        .eq('invited_email', userEmail)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const mapped: ReceivedShare[] = (data ?? []).map((s: Record<string, unknown>) => {
        const trip = s.trips as Record<string, string> | null;
        const profile = s.profiles as Record<string, string> | null;
        return {
          id: s.id as string,
          trip_id: s.trip_id as string,
          owner_id: s.owner_id as string,
          permission: s.permission as SharePermission,
          status: s.status as ShareStatus,
          created_at: s.created_at as string,
          trip_title: trip?.title || '여행',
          trip_destination: trip?.destination || '',
          trip_cover: trip?.cover_image || '',
          trip_status: trip?.status || 'planned',
          trip_start_date: trip?.start_date || '',
          owner_nickname: profile?.nickname || '사용자',
        };
      });
      setShares(mapped);
    } catch {
      setShares([]);
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

  return { shares, loading, refetch };
}
