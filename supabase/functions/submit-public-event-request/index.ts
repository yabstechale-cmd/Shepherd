import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { renderShepherdNotificationEmail } from "../_shared/shepherd-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_FIELDS = [
  "event_name",
  "setup_datetime",
  "description",
  "contact_name",
  "phone",
  "email",
  "location_scope",
  "signature",
];

const EMAIL_TEMPLATE_VERSION = "shepherd-clean-dark-2026-04-23";

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

function getRequesterKey(req: Request, churchId: string, email: string) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim() || "";
  const ip = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || firstForwardedIp
    || "unknown";
  return `${churchId}:${ip}:${email.toLowerCase().trim() || "unknown"}`.slice(0, 500);
}

function cleanString(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanStringArray(value: unknown, maxItems = 20, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => cleanString(entry, maxLength)).filter(Boolean).slice(0, maxItems);
}

function cleanInteger(value: unknown, maxValue = 10000) {
  const parsed = Number.parseInt(String(value || "0"), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, maxValue);
}

function cleanBoolean(value: unknown) {
  return value === true || value === "true";
}

function createPublicAccessToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isChurchAdministrator(profile: Record<string, unknown>) {
  const role = String(profile?.role || "").trim();
  const title = String(profile?.title || "").trim().toLowerCase();
  const staffRoles = Array.isArray(profile?.staff_roles) ? profile.staff_roles.map((entry) => String(entry || "").trim()) : [];
  return role === "church_administrator"
    || staffRoles.includes("church_administrator")
    || title === "church administrator";
}

async function sendEventRequestNotifications(
  adminClient: ReturnType<typeof createClient>,
  church: { id: string; name?: string | null },
  request: { id: string; event_name?: string | null; contact_name?: string | null },
) {
  const { data: admins, error: adminsError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, staff_roles, title")
    .eq("church_id", church.id);
  if (adminsError) throw adminsError;

  const adminRecipients = (admins || []).filter(isChurchAdministrator);
  if (adminRecipients.length === 0) return;

  const notificationRows = adminRecipients.map((admin) => ({
    church_id: church.id,
    recipient_profile_id: admin.id,
    actor_profile_id: null,
    type: "event_request_submitted",
    title: "New Event Request Submitted",
    detail: `${request.contact_name || "A requester"} submitted ${request.event_name || "an event request"}.`,
    target: "events-board",
    task_id: null,
    source_key: request.id,
    data: { eventRequestId: request.id, eventName: request.event_name || "" },
    read_at: null,
    archived_at: null,
  }));

  const { data: savedNotifications, error: notificationError } = await adminClient
    .from("notifications")
    .upsert(notificationRows, { onConflict: "recipient_profile_id,type,source_key", ignoreDuplicates: true })
    .select();
  if (notificationError) throw notificationError;

  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const fromEmail = Deno.env.get("SHEPHERD_EMAIL_FROM") || "";
  if (!resendApiKey || !fromEmail) return;

  const appUrl = (Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "");
  const notificationByRecipient = new Map((savedNotifications || []).map((notification) => [notification.recipient_profile_id, notification]));
  await Promise.all(adminRecipients.map(async (admin) => {
    if (!admin.email) return;
    const notification = notificationByRecipient.get(admin.id);
    if (!notification?.id || notification.emailed_at) return;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [admin.email],
        subject: `Shepherd: New Event Request Submitted`,
        html: renderShepherdNotificationEmail({
          title: "New Event Request Submitted",
          detail: `${request.contact_name || "A requester"} submitted ${request.event_name || "an event request"}.`,
          actionUrl: `${appUrl}/events`,
          actionLabel: "Review Request",
          churchName: church.name || "Shepherd",
          eyebrow: "Shepherd Event Request",
        }),
      }),
    });

    if (!response.ok) return;
    await adminClient
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", notification.id);
  }));
}

function buildEventRequestPayload(churchId: string, form: Record<string, unknown>, eventTiming: string, tablesNeeded: string) {
  const payload = {
    church_id: churchId,
    status: "new",
    requested_by: cleanString(form.contact_name, 160),
    public_access_token: createPublicAccessToken(),
    public_access_enabled: true,
    public_comments: [],
    event_name: cleanString(form.event_name, 200),
    event_format: cleanString(form.event_format, 80),
    event_timing: cleanString(eventTiming, 500),
    single_date: cleanString(form.single_date, 40) || null,
    single_start_time: cleanString(form.single_start_time, 40),
    single_end_time: cleanString(form.single_end_time, 40),
    multi_start_date: cleanString(form.multi_start_date, 40) || null,
    multi_end_date: cleanString(form.multi_end_date, 40) || null,
    multi_start_time: cleanString(form.multi_start_time, 40),
    multi_end_time: cleanString(form.multi_end_time, 40),
    recurring_start_date: cleanString(form.recurring_start_date, 40) || null,
    recurring_start_time: cleanString(form.recurring_start_time, 40),
    recurring_end_time: cleanString(form.recurring_end_time, 40),
    recurring_frequency: cleanString(form.recurring_frequency, 120),
    setup_datetime: cleanString(form.setup_datetime, 80),
    description: cleanString(form.description, 4000),
    contact_name: cleanString(form.contact_name, 160),
    phone: cleanString(form.phone, 80),
    email: cleanString(form.email, 254).toLowerCase(),
    location_scope: cleanString(form.location_scope, 80),
    location_areas: cleanStringArray(form.location_areas),
    graphics_reference: cleanString(form.graphics_reference, 1000),
    av_request: cleanBoolean(form.av_request),
    av_request_details: cleanString(form.av_request_details, 2000),
    tables_needed: cleanString(tablesNeeded, 1000),
    tables_6ft_rectangular: cleanInteger(form.tables_6ft_rectangular),
    tables_8ft_rectangular: cleanInteger(form.tables_8ft_rectangular),
    tables_5ft_round: cleanInteger(form.tables_5ft_round),
    black_vinyl_tablecloths: cleanString(form.black_vinyl_tablecloths, 500),
    white_linen_tablecloths: cleanString(form.white_linen_tablecloths, 500),
    white_linen_agreement: cleanBoolean(form.white_linen_agreement),
    pipe_and_drape: cleanString(form.pipe_and_drape, 500),
    metal_folding_chairs_requested: cleanBoolean(form.metal_folding_chairs_requested),
    metal_folding_chairs: cleanInteger(form.metal_folding_chairs),
    sanctuary_chairs: cleanString(form.sanctuary_chairs, 500),
    kitchen_use: cleanBoolean(form.kitchen_use),
    drip_coffee_only: cleanBoolean(form.drip_coffee_only),
    espresso_drinks: cleanBoolean(form.espresso_drinks),
    additional_information: cleanString(form.additional_information, 4000),
    signature: cleanString(form.signature, 160),
  };

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const body = await req.json();
    const churchCode = cleanString(body?.churchCode, 20);
    const form = (body?.eventForm && typeof body.eventForm === "object") ? body.eventForm as Record<string, unknown> : {};
    const eventTiming = cleanString(body?.eventTiming, 500);
    const tablesNeeded = cleanString(body?.tablesNeeded, 1000);

    if (!churchCode) return jsonResponse(400, { error: "Church code is required." });
    if (!eventTiming) return jsonResponse(400, { error: "Event timing is required." });

    for (const field of REQUIRED_FIELDS) {
      if (!cleanString(form[field], 4000)) {
        return jsonResponse(400, { error: "Please complete the required fields before submitting this request." });
      }
    }

    const email = cleanString(form.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, { error: "Enter a valid email address." });
    }

    if (cleanString(form.location_scope, 80) === "building" && cleanStringArray(form.location_areas).length === 0) {
      return jsonResponse(400, { error: "Please select at least one church area for building-use requests." });
    }
    if (cleanString(form.white_linen_tablecloths, 500) && !cleanBoolean(form.white_linen_agreement)) {
      return jsonResponse(400, { error: "Please agree to launder and press the white linen tablecloths before submitting." });
    }
    if (cleanBoolean(form.metal_folding_chairs_requested) && cleanInteger(form.metal_folding_chairs) <= 0) {
      return jsonResponse(400, { error: "Please enter how many metal folding chairs you need." });
    }

    const adminClient = getAdminClient();
    const { data: church, error: churchError } = await adminClient
      .from("churches")
      .select("id, name")
      .ilike("code", churchCode)
      .maybeSingle();
    if (churchError) throw churchError;
    if (!church?.id) return jsonResponse(404, { error: "That church code was not found." });

    const requesterKey = getRequesterKey(req, church.id, email);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await adminClient
      .from("event_request_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("requester_key", requesterKey)
      .gte("created_at", oneHourAgo);
    if (countError) throw countError;
    if ((count || 0) >= 5) {
      return jsonResponse(429, { error: "Too many event requests were submitted recently. Please wait a bit and try again." });
    }

    const payload = buildEventRequestPayload(church.id, form, eventTiming, tablesNeeded);
    const { data: insertedRequest, error: insertError } = await adminClient
      .from("event_requests")
      .insert(payload)
      .select("id, event_name, contact_name, public_access_token")
      .single();
    if (insertError) throw insertError;

    await adminClient.from("event_request_rate_limits").insert({
      church_id: church.id,
      requester_key: requesterKey,
    });

    await sendEventRequestNotifications(adminClient, church, insertedRequest);

    return jsonResponse(200, {
      submitted: true,
      churchName: church.name,
      publicAccessToken: insertedRequest?.public_access_token || null,
      emailTemplateVersion: EMAIL_TEMPLATE_VERSION,
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "We couldn't submit that request." });
  }
});
