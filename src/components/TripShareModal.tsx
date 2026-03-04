import { useState } from 'react';
import { createShare, removeShare, updateSharePermission } from '../hooks/useShares';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirmModal } from '../hooks/useConfirmModal';
import ConfirmModal from './ConfirmModal';
import type { SharePermission } from '../types/database';

interface ShareInfo {
  id: string;
  invited_email: string;
  permission: SharePermission;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle?: string;
  isDemo: boolean;
  shares: ShareInfo[];
  sharesLoading: boolean;
}

export default function TripShareModal({ open, onClose, tripId, tripTitle, isDemo, shares, sharesLoading }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirmModal, setConfirmModal } = useConfirmModal();
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<SharePermission>('read');
  const [inviting, setInviting] = useState(false);

  if (!open) return null;

  const handleInvite = async () => {
    if (!tripId || !inviteEmail.trim()) return;
    if (!user) {
      toast('로그인이 필요합니다', 'error');
      return;
    }
    try {
      setInviting(true);
      if (isDemo) {
        const { createDemoShareDirect } = await import('../hooks/useShares');
        createDemoShareDirect(tripId, user.id, inviteEmail.trim(), invitePermission, tripTitle);
      } else {
        await createShare(tripId, user.id, inviteEmail.trim(), invitePermission, tripTitle);
      }
      setInviteEmail('');
      toast('초대를 보냈습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '초대 실패', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveShare = (shareId: string) => {
    setConfirmModal({
      open: true,
      title: '공유 취소',
      message: '이 공유를 취소하시겠습니까?',
      confirmLabel: '취소하기',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }));
        try {
          await removeShare(shareId);
          toast('공유가 취소되었습니다');
        } catch (err) {
          toast(err instanceof Error ? err.message : '삭제 실패', 'error');
        }
      },
    });
  };

  const handlePermissionChange = async (shareId: string, perm: SharePermission) => {
    try {
      await updateSharePermission(shareId, perm);
      toast('권한이 변경되었습니다');
    } catch (err) {
      toast(err instanceof Error ? err.message : '권한 변경 실패', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share Mission"
          className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border-[3px] border-slate-900 sm:retro-shadow flex flex-col max-h-[75dvh] sm:max-h-[85dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 — 고정 */}
          <div className="shrink-0 px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Share Mission</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sm:hidden flex justify-center mt-2">
              <div className="w-12 h-1.5 rounded-full bg-[#1c140d]/20 dark:bg-slate-600" />
            </div>
          </div>

          {/* 스크롤 가능한 본문 */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            {/* 초대 폼 */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Invite</p>
              <div className="flex gap-2">
                <input
                  id="share-trip-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  aria-label="초대할 이메일 주소"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-900 text-sm font-medium bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                />
                <select
                  id="share-trip-permission"
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as SharePermission)}
                  aria-label="공유 권한"
                  className="w-20 shrink-0 px-2 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold bg-white dark:bg-[#2a1f15] dark:text-slate-100 dark:border-slate-100 focus:outline-none focus:ring-2 focus:ring-[#f48c25]/40"
                >
                  <option value="read">읽기</option>
                  <option value="edit">편집</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-tight text-white bg-[#0d9488] border-2 border-slate-900 retro-shadow hover:bg-[#0d9488]/90 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {inviting ? '초대 중...' : '초대 보내기'}
              </button>
            </div>

            {/* 공유 목록 */}
            {shares.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Shared With</p>
                <div className="space-y-2">
                  {shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-[#F9F4E8] dark:bg-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          s.status === 'accepted' ? 'bg-[#0d9488] text-white' : 'bg-[#eab308] text-slate-900'
                        }`}>
                          {s.invited_email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{s.invited_email}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {s.status === 'pending' ? '수락 대기중' : s.status === 'accepted' ? '수락됨' : '거절됨'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={s.permission}
                          onChange={(e) => handlePermissionChange(s.id, e.target.value as SharePermission)}
                          className="px-2 py-1 rounded-lg border-2 border-slate-300 text-[10px] font-bold bg-white focus:outline-none"
                        >
                          <option value="read">읽기</option>
                          <option value="edit">편집</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveShare(s.id)}
                          className="text-slate-300 hover:text-[#f43f5e] transition-colors cursor-pointer bg-transparent border-0 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shares.length === 0 && !sharesLoading && (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🔗</p>
                <p className="text-sm text-slate-400 font-medium">아직 공유된 사람이 없습니다</p>
                <p className="text-xs text-slate-300 mt-1">이메일로 초대하여 함께 여행을 계획해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, open: false }))}
      />
    </>
  );
}
