import { supabase, isSupabaseConfigured } from './supabase';

interface ShareEmailParams {
  invitedEmail: string;
  tripTitle: string;
  ownerNickname: string;
}

/**
 * 공유 초대 이메일을 발송합니다.
 * Supabase Edge Function(send-share-email)을 호출합니다.
 * 실패해도 공유 자체는 정상 처리되므로, 에러를 throw하지 않고 console.warn으로 처리합니다.
 */
export async function sendShareInvitationEmail(params: ShareEmailParams): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const appUrl = window.location.origin;
    const { error } = await supabase.functions.invoke('send-share-email', {
      body: {
        invited_email: params.invitedEmail,
        trip_title: params.tripTitle,
        owner_nickname: params.ownerNickname,
        app_url: appUrl,
      },
    });
    if (error) {
      console.warn('[sendShareInvitationEmail] Edge Function 호출 실패:', error.message);
    }
  } catch (err) {
    console.warn('[sendShareInvitationEmail] 이메일 발송 실패 (공유는 정상 처리됨):', err);
  }
}
