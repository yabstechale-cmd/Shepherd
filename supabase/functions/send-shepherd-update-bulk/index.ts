import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

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

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFirstName(fullName: unknown) {
  const clean = String(fullName || "").trim();
  if (!clean) return "there";
  return clean.split(/\s+/)[0] || "there";
}

function renderUpdateList({
  recipientName,
  intro,
  updateItems,
  closing,
}: {
  recipientName: string;
  intro: string;
  updateItems: string[];
  closing: string;
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
    const body = await req.json().catch(() => ({}));
    const campaignKey = String(body?.campaignKey || "").trim();
    const scheduledFor = String(body?.scheduledFor || "").trim();
    const subject = String(body?.subject || "Shepherd Updates Are Live").trim();
    const title = String(body?.title || "Shepherd Updates Are Live").trim();
    const intro = String(body?.intro || "I wanted to send a quick update and let you know that several new Shepherd improvements are now live.").trim();
    const detail = String(body?.detail || intro).trim();
    const closing = String(body?.closing || "Thank you again for the feedback, testing, and patience as Shepherd continues to improve. More updates are still to come.").trim();
    const footerText = String(body?.footerText || "You received this because you are an active Shepherd user.").trim();
    const updateItems = Array.isArray(body?.updateItems)
      ? body.updateItems.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!campaignKey) {
      return jsonResponse(400, { error: "campaignKey is required." });
    }
    if (!scheduledFor) {
      return jsonResponse(400, { error: "scheduledFor is required." });
    }

    const scheduledAt = new Date(scheduledFor);
    if (Number.isNaN(scheduledAt.getTime())) {
      return jsonResponse(400, { error: "scheduledFor must be a valid ISO timestamp." });
    }
    if (scheduledAt.getTime() > Date.now()) {
      return jsonResponse(409, { error: "This Shepherd update is scheduled for later and is not ready to send yet." });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(500, { error: "Email provider is not configured yet." });
    }

    const adminClient = getAdminClient();
    const { data: existingCampaign } = await adminClient
      .from("shepherd_update_campaigns")
      .select("campaign_key, sent_at, scheduled_for")
      .eq("campaign_key", campaignKey)
      .maybeSingle();

    if (existingCampaign?.sent_at) {
      return jsonResponse(200, {
        skipped: true,
        reason: "This update campaign has already been sent.",
        campaignKey,
        sentAt: existingCampaign.sent_at,
      });
    }

    if (!existingCampaign) {
      const { error: insertError } = await adminClient
        .from("shepherd_update_campaigns")
        .insert({
          campaign_key: campaignKey,
          scheduled_for: scheduledAt.toISOString(),
        });
      if (insertError) {
        return jsonResponse(500, { error: insertError.message });
      }
    }

    const { data: recipients, error: recipientsError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, church_id")
      .not("email", "is", null)
      .not("church_id", "is", null);

    if (recipientsError) {
      return jsonResponse(500, { error: recipientsError.message });
    }

    const uniqueRecipients = new Map<string, { id: string; full_name: string; email: string }>();
    for (const recipient of recipients || []) {
      const email = String(recipient.email || "").trim().toLowerCase();
      if (!email) continue;
      if (!uniqueRecipients.has(email)) {
        uniqueRecipients.set(email, {
          id: String(recipient.id || ""),
          full_name: String(recipient.full_name || "").trim(),
          email,
        });
      }
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    let sentCount = 0;
    const failed: Array<{ email: string; error: string }> = [];

    for (const recipient of uniqueRecipients.values()) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject,
          html: renderShepherdNotificationEmail({
            title,
            detail,
            detailHtml: renderUpdateList({
              recipientName: getFirstName(recipient.full_name),
              intro,
              updateItems,
              closing,
            }),
            actionUrl: appUrl,
            actionLabel: "Open Shepherd",
            eyebrow: "Shepherd Update",
            detailLabel: "What Changed",
            footerText,
          }),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        failed.push({
          email: recipient.email,
          error: String(payload?.message || "Email provider rejected this message."),
        });
        continue;
      }

      sentCount += 1;
    }

    if (sentCount > 0) {
      await adminClient
        .from("shepherd_update_campaigns")
        .update({
          scheduled_for: scheduledAt.toISOString(),
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failed.length,
        })
        .eq("campaign_key", campaignKey);
    }

    return jsonResponse(200, {
      sent: sentCount,
      failed: failed.length,
      failures: failed,
      campaignKey,
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Bulk Shepherd update email failed." });
  }
});
