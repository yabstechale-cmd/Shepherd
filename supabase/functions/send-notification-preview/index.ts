import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const previewNotifications = [
  {
    title: "New Task Assigned",
    detail: "Prepare Sunday volunteer briefing was assigned to you by Yabs.",
    target: "/tasks",
  },
  {
    title: "New Comment On A Task",
    detail: "Shannan commented on Prepare Sunday volunteer briefing.",
    target: "/tasks",
  },
  {
    title: "You Were Mentioned In A Task",
    detail: "Eric mentioned you in Update Easter follow-up plan.",
    target: "/tasks",
  },
  {
    title: "Review Requested",
    detail: "Finalize camp parent packet is ready for your review.",
    target: "/tasks",
  },
  {
    title: "Task Due Tomorrow",
    detail: "Confirm youth room setup needs attention soon.",
    target: "/tasks",
  },
  {
    title: "Task Overdue",
    detail: "Submit volunteer background check list is overdue.",
    target: "/tasks",
  },
  {
    title: "Purchase Order Needs Review",
    detail: "A staff member submitted Camp supplies for $450.",
    target: "/finances",
  },
  {
    title: "Purchase Order Approved",
    detail: "Camp supplies was fully approved.",
    target: "/finances",
  },
  {
    title: "Purchase Order Denied",
    detail: "New lobby signage was denied by Finance.",
    target: "/finances",
  },
  {
    title: "PTO Request Needs Review",
    detail: "A staff member submitted a PTO request for May 12-May 16.",
    target: "/operations",
  },
  {
    title: "PTO Request Approved",
    detail: "PTO Request was fully approved and added to the calendar.",
    target: "/operations",
  },
  {
    title: "PTO Request Denied",
    detail: "PTO Request was denied by a reviewer.",
    target: "/operations",
  },
  {
    title: "Church Lock-Up Assigned",
    detail: "You are assigned to lock up for 05/04-05/10.",
    target: "/operations",
  },
  {
    title: "New Event Request Submitted",
    detail: "A requester submitted Youth Camp Info Meeting.",
    target: "/events",
  },
];

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const userClient = await getUserClient(req);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return jsonResponse(401, { error: "We could not verify this Shepherd session." });
    }

    const adminClient = getAdminClient();
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

    const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-mauve.vercel.app").replace(/\/+$/, "");
    const sent = [];

    for (const notification of previewNotifications) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: `Shepherd Preview: ${notification.title}`,
          html: renderShepherdNotificationEmail({
            title: notification.title,
            detail: notification.detail,
            actionUrl: `${appUrl}${notification.target}`,
            churchName: church?.name || "Preview Church",
            eyebrow: "Shepherd Email Preview",
          }),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return jsonResponse(502, { error: payload?.message || `Email provider rejected ${notification.title}.` });
      }
      sent.push(notification.title);
    }

    return jsonResponse(200, { sent, recipientEmail });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Preview emails failed." });
  }
});
