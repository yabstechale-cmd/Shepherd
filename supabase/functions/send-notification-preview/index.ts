import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_TEMPLATE_VERSION = "shepherd-clean-dark-no-church-2026-04-23";
const GUEST_CONFIRMATION_TEMPLATE_VERSION = "event-request-confirmation-2026-04-23";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const adminClient = getAdminClient();
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return jsonResponse(401, { error: "Please log in again before sending preview emails." });
    }
    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
    if (authError || !authData?.user?.id) {
      return jsonResponse(401, { error: "We could not verify this Shepherd session." });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, church_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    const { data: church } = profile?.church_id
      ? await adminClient.from("churches").select("name").eq("id", profile.church_id).maybeSingle()
      : { data: null };

    const recipientEmail = profile?.email || authData.user.email || "";
    if (!recipientEmail) {
      return jsonResponse(400, { error: "Your Shepherd profile does not have an email address yet." });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(500, { error: "Email provider is not configured yet." });
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    const guestConfirmationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: "Shepherd Preview: Event Request Confirmation",
        html: renderShepherdNotificationEmail({
          title: "Event Request Received",
          detail: "Hi Yabs, we received your request for Youth Camp Info Meeting. The Administrator will review it and follow up within one week. Use the button below to check the status, update details while it is still new, answer follow-up questions, or comment on the request.",
          actionUrl: `${appUrl}/event-request/preview-request-token`,
          actionLabel: "View My Request",
          churchName: church?.name || "Preview Church",
          eyebrow: "Shepherd Event Request",
          detailLabel: "Confirmation",
          footerText: "You received this because you submitted an event request through Shepherd. Keep this email so you can return to your request later.",
        }),
      }),
    });
    const guestConfirmationPayload = await guestConfirmationResponse.json().catch(() => ({}));
    if (!guestConfirmationResponse.ok) {
      return jsonResponse(502, { error: guestConfirmationPayload?.message || "Email provider rejected the event request confirmation preview." });
    }
    return jsonResponse(200, {
      sent: ["Event Request Confirmation"],
      recipientEmail,
      emailTemplateVersion: EMAIL_TEMPLATE_VERSION,
      guestConfirmationTemplateVersion: GUEST_CONFIRMATION_TEMPLATE_VERSION,
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Preview emails failed." });
  }
});
