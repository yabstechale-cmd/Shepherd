import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { escapeHtml } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function sanitizePlainText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeItemList(value: unknown, maxItems = 12, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizePlainText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

async function getAuthorizedRequester(adminClient: ReturnType<typeof createClient>, req: Request) {
  const accessToken = getBearerToken(req);
  if (!accessToken) return null;

  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData?.user?.id) return null;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, church_id, full_name, email, role, title, can_see_admin_overview")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.id || !profile?.email) return null;

  const title = String(profile.title || "").trim().toLowerCase();
  const canSend = profile.role === "admin"
    || profile.role === "church_administrator"
    || title === "church administrator"
    || profile.can_see_admin_overview === true;

  if (!canSend) return null;
  return profile;
}

function renderUpdateList({
  recipientName = "Yabs",
  intro = "Here is a quick rundown of the Shepherd updates that are now live:",
  updateItems = [],
  closing = "Thank you for all the input and feedback you have shared so far. More improvements are already on the way as Shepherd continues to grow.",
}: {
  recipientName?: string;
  intro?: string;
  updateItems?: string[];
  closing?: string;
}) {
  return `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 18px 0;">${escapeHtml(intro)}</p>
    <ul style="margin:0;padding-left:22px;">
      ${updateItems.map((item) => `<li style="margin:0 0 10px 0;">${escapeHtml(item)}</li>`).join("")}
    </ul>
    <p style="margin:18px 0 0 0;">${escapeHtml(closing)}</p>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const adminClient = getAdminClient();
    const requester = await getAuthorizedRequester(adminClient, req);
    if (!requester) {
      return jsonResponse(403, { error: "Only authorized Shepherd admins can send this preview email." });
    }

    const body = await req.json().catch(() => ({}));
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = sanitizePlainText(Deno.env.get("SHEPHERD_EMAIL_FROM") || "", 200);
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(500, { error: "Email provider is not configured yet." });
    }
    if (!isValidEmailAddress(fromEmail)) {
      return jsonResponse(500, { error: "The configured sender email is invalid." });
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    const recipientEmail = sanitizePlainText(requester.email, 200);
    const recipientName = sanitizePlainText(body?.recipientName || requester.full_name || "there", 120);
    const subject = sanitizePlainText(body?.subject || "Shepherd Updates Are Live", 160);
    const title = sanitizePlainText(body?.title || "Shepherd Updates Are Live", 160);
    const intro = sanitizePlainText(body?.intro || "Here is a quick rundown of the Shepherd updates that are now live.", 600);
    const detail = sanitizePlainText(body?.detail || intro, 600);
    const closing = sanitizePlainText(body?.closing || "Thank you for all the input and feedback you have shared so far. More improvements are already on the way as Shepherd continues to grow.", 600);
    const footerText = sanitizePlainText(body?.footerText || "You received this because Shepherd is preparing a user update email. Once approved, Shepherd can send a personalized version to each active user.", 320);
    const updateItems = sanitizeItemList(body?.updateItems);

    if (!recipientEmail || !isValidEmailAddress(recipientEmail)) {
      return jsonResponse(400, { error: "Your Shepherd profile needs a valid email before a preview can be sent." });
    }
    if (!subject || !title || !intro || !closing) {
      return jsonResponse(400, { error: "subject, title, intro, and closing are required." });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html: renderShepherdNotificationEmail({
          title,
          detail,
          detailHtml: renderUpdateList({ recipientName, intro, updateItems, closing }),
          actionUrl: appUrl,
          actionLabel: "Open Shepherd",
          eyebrow: "Shepherd Update",
          detailLabel: "What Changed",
          footerText,
        }),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse(502, { error: payload?.message || "Email provider rejected the Shepherd update test." });
    }
    return jsonResponse(200, {
      sent: true,
      recipientEmail,
      providerId: payload?.id || null,
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Shepherd update test email failed." });
  }
});
