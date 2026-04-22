import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const routeByTarget: Record<string, string> = {
  dashboard: "/dashboard",
  tasks: "/tasks",
  budget: "/finances",
  "events-board": "/events",
  "operations-board": "/operations",
  calendar: "/calendar",
  account: "/account",
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    throw new Error("Missing Shepherd session credentials.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
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

function actorCanManageChurch(actor: {
  id?: string | null;
  role?: string | null;
  staff_roles?: string[] | null;
  title?: string | null;
  can_see_admin_overview?: boolean | null;
}, church: {
  account_admin_user_id?: string | null;
  account_manager_user_ids?: string[] | null;
} | null) {
  const roles = Array.isArray(actor.staff_roles) ? actor.staff_roles : [];
  const title = String(actor.title || "").trim().toLowerCase();
  const managerIds = Array.isArray(church?.account_manager_user_ids) ? church.account_manager_user_ids : [];
  return Boolean(
    actor.can_see_admin_overview
    || actor.role === "church_administrator"
    || actor.role === "admin"
    || actor.role === "senior_pastor"
    || roles.includes("church_administrator")
    || roles.includes("senior_pastor")
    || title === "church administrator"
    || title === "senior pastor"
    || church?.account_admin_user_id === actor.id
    || managerIds.includes(String(actor.id || ""))
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const { notificationId } = await req.json();
    if (!notificationId) return jsonResponse(400, { error: "Notification is required." });

    const userClient = await getUserClient(req);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return jsonResponse(401, { error: "We could not verify this Shepherd session." });
    }

    const adminClient = getAdminClient();
    const { data: actor } = await adminClient
      .from("profiles")
      .select("id, full_name, church_id, role, staff_roles, title, can_see_admin_overview")
      .eq("id", authData.user.id)
      .maybeSingle();
    const { data: notification } = await adminClient
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .maybeSingle();

    if (!actor?.church_id || !notification?.church_id || actor.church_id !== notification.church_id) {
      return jsonResponse(403, { error: "This notification is outside your church scope." });
    }

    if (notification.emailed_at) {
      return jsonResponse(200, { skipped: true, reason: "Notification email already sent." });
    }

    const { data: recipient } = await adminClient
      .from("profiles")
      .select("id, full_name, email, church_id")
      .eq("id", notification.recipient_profile_id)
      .maybeSingle();
    const { data: church } = await adminClient
      .from("churches")
      .select("name, account_admin_user_id, account_manager_user_ids")
      .eq("id", notification.church_id)
      .maybeSingle();

    if (!recipient?.email) {
      return jsonResponse(200, { skipped: true, reason: "Recipient does not have an email address." });
    }

    if (recipient.church_id !== notification.church_id) {
      return jsonResponse(403, { error: "This notification recipient is outside your church scope." });
    }

    const canSendNotificationEmail = actor.id === notification.actor_profile_id
      || actor.id === notification.recipient_profile_id
      || actorCanManageChurch(actor, church);
    if (!canSendNotificationEmail) {
      return jsonResponse(403, { error: "You can only send email for notifications you created, received, or manage." });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
    if (!resendApiKey || !fromEmail) {
      return jsonResponse(200, { skipped: true, reason: "Email provider is not configured yet." });
    }

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
    const targetRoute = routeByTarget[notification.target || "dashboard"] || "/dashboard";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient.email],
        subject: `Shepherd: ${notification.title}`,
        html: renderShepherdNotificationEmail({
          title: notification.title,
          detail: notification.detail,
          actionUrl: `${appUrl}${targetRoute}`,
          churchName: church?.name || "Shepherd",
          eyebrow: "Shepherd Notification",
        }),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse(502, { error: payload?.message || "Email provider rejected this message." });
    }

    await adminClient.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", notification.id);

    return jsonResponse(200, { sent: true });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Notification email failed." });
  }
});
