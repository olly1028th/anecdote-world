// Supabase Edge Function: 공유 초대 이메일 발송
// 배포: supabase functions deploy send-share-email
// 시크릿 설정: supabase secrets set RESEND_API_KEY=re_xxxxxxx

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  invited_email: string;
  trip_title: string;
  owner_nickname: string;
  app_url: string;
}

/** HTML 특수문자 이스케이프 — XSS 방지 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL을 허용된 스킴으로 제한 — javascript: 등 방지 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return escapeHtml(url);
    }
  } catch { /* invalid URL */ }
  return "#";
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { invited_email, trip_title, owner_nickname, app_url } =
      (await req.json()) as RequestBody;

    if (!invited_email) {
      return new Response(
        JSON.stringify({ error: "invited_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeNickname = escapeHtml(owner_nickname || "사용자");
    const safeTitle = escapeHtml(trip_title || "여행");
    const safeUrl = sanitizeUrl(app_url || "");

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F9F4E8; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #f48c25; color: white; padding: 8px 12px; border-radius: 12px; border: 3px solid #1c140d; transform: rotate(12deg);">
            <span style="font-size: 20px;">⚡</span>
          </div>
          <h1 style="font-size: 24px; font-weight: bold; color: #1c140d; margin: 16px 0 4px; letter-spacing: -0.5px; text-transform: uppercase; font-style: italic;">Anecdote</h1>
        </div>

        <div style="background: white; border: 3px solid #1c140d; border-radius: 16px; padding: 24px; box-shadow: 6px 6px 0px 0px rgba(0,0,0,0.1);">
          <h2 style="font-size: 18px; color: #1c140d; margin: 0 0 8px;">새로운 여행 초대!</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px; line-height: 1.5;">
            <strong style="color: #0d9488;">${safeNickname}</strong>님이
            <strong>"${safeTitle}"</strong> 여행에 초대했습니다.
          </p>

          <a href="${safeUrl}" style="display: block; text-align: center; background: #0d9488; color: white; padding: 14px 24px; border-radius: 12px; border: 3px solid #1c140d; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
            앱에서 초대 확인하기
          </a>

          <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0; text-align: center;">
            앱에 로그인하면 초대를 수락하거나 거절할 수 있습니다.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
          Anecdote World — 나만의 여행 기록
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Anecdote <noreply@anecdote-world.vercel.app>",
        to: [invited_email],
        subject: `[Anecdote] ${safeNickname}님이 "${safeTitle}" 여행에 초대했습니다`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
