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
    <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
    <p style="margin:0 0 18px 0;">${intro}</p>
    <ul style="margin:0;padding-left:22px;">
      ${updateItems.map((item) => `<li style="margin:0 0 10px 0;">${item}</li>`).join("")}
    </ul>
    <p style="margin:18px 0 0 0;">${closing}</p>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({}));
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(500, { error: "Email provider is not configured yet." });
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    const recipientEmail = String(body?.recipientEmail || "yabstechale@gmail.com").trim();
    const recipientName = String(body?.recipientName || "Yabs").trim();
    const subject = String(body?.subject || "Shepherd Updates Are Live").trim();
    const title = String(body?.title || "Shepherd Updates Are Live").trim();
    const intro = String(body?.intro || "Here is a quick rundown of the Shepherd updates that are now live.").trim();
    const detail = String(body?.detail || intro).trim();
    const closing = String(body?.closing || "Thank you for all the input and feedback you have shared so far. More improvements are already on the way as Shepherd continues to grow.").trim();
    const footerText = String(body?.footerText || "You received this because Shepherd is preparing a user update email. Once approved, Shepherd can send a personalized version to each active user.").trim();
    const updateItems = Array.isArray(body?.updateItems)
      ? body.updateItems.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!recipientEmail) {
      return jsonResponse(400, { error: "recipientEmail is required." });
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
