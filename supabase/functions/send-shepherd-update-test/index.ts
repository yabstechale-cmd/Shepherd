import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const updateItems = [
  "Improved the Finance area with a cleaner Finance Hub and separate Ministry Budgets and Purchase Orders pages.",
  "Updated Ministry Budget cards to show starting budget, amount spent, remaining budget, transactions, and budget line details.",
  "Added transaction details showing when a transaction happened and who added it.",
  "Improved Purchase Orders so requests are easier to open, review, comment on, approve, or deny.",
  "Added clearer save and error feedback so actions should no longer silently fail.",
  "Added drag-and-drop movement for tasks and items between statuses, while keeping the dropdown status selector.",
  "Clarified finance visibility: staff only see assigned ministry budgets, while the Finance Director can see all budgets.",
  "Updated the Calendar with a cleaner full-month view and list view options.",
  "Improved Google Calendar imports and calendar filter labels.",
  "Updated FAQ answers so they better reflect how Shepherd currently works.",
  "Added guidance that task attachments should be shared as links rather than uploads for now.",
  "Added clearer red permission notices when a user cannot edit certain locked fields.",
  "Expanded the dashboard greeting Scripture rotation from 8 verses to 40.",
  "Updated the Scripture rotation to include fuller verses about work, God’s goodness, God’s glory, speech, humility, peace, wisdom, and Christian living.",
  "Polished small UI details across Finance, Calendar, FAQ, and permission messaging.",
];

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function renderUpdateList() {
  return `
    <p style="margin:0 0 16px 0;">Hi Yabs,</p>
    <p style="margin:0 0 18px 0;">Here is a quick rundown of the Shepherd updates that are now live:</p>
    <ul style="margin:0;padding-left:22px;">
      ${updateItems.map((item) => `<li style="margin:0 0 10px 0;">${item}</li>`).join("")}
    </ul>
    <p style="margin:18px 0 0 0;">Thank you for all the input and feedback you have shared so far. More improvements are already on the way as Shepherd continues to grow.</p>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(500, { error: "Email provider is not configured yet." });
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    const recipientEmail = "yabstechale@gmail.com";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: "Shepherd Updates Are Live",
        html: renderShepherdNotificationEmail({
          title: "Shepherd Updates Are Live",
          detail: "Here is a quick rundown of the Shepherd updates that are now live.",
          detailHtml: renderUpdateList(),
          actionUrl: appUrl,
          actionLabel: "Open Shepherd",
          eyebrow: "Shepherd Update",
          detailLabel: "What Changed",
          footerText: "You received this test because Shepherd is preparing a user update email. Once approved, Shepherd can send a personalized version to each active user.",
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
