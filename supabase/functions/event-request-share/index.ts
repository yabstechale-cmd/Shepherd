import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFE_UPDATE_FIELDS = [
  "event_name",
  "event_format",
  "event_timing",
  "single_date",
  "single_start_time",
  "single_end_time",
  "multi_start_date",
  "multi_end_date",
  "multi_start_time",
  "multi_end_time",
  "recurring_start_date",
  "recurring_start_time",
  "recurring_end_time",
  "recurring_frequency",
  "setup_datetime",
  "description",
  "contact_name",
  "phone",
  "email",
  "location_scope",
  "location_areas",
  "graphics_reference",
  "av_request",
  "av_request_details",
  "tables_needed",
  "tables_6ft_rectangular",
  "tables_8ft_rectangular",
  "tables_5ft_round",
  "black_vinyl_tablecloths",
  "white_linen_tablecloths",
  "white_linen_agreement",
  "pipe_and_drape",
  "metal_folding_chairs_requested",
  "metal_folding_chairs",
  "sanctuary_chairs",
  "kitchen_use",
  "drip_coffee_only",
  "espresso_drinks",
  "additional_information",
  "signature",
];

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

function sanitizeUpdatePayload(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of SAFE_UPDATE_FIELDS) {
    if (!(field in input)) continue;
    const value = input[field];
    if (field === "location_areas") payload[field] = cleanStringArray(value);
    else if (field.startsWith("tables_") || field === "metal_folding_chairs") payload[field] = cleanInteger(value);
    else if ([
      "av_request",
      "white_linen_agreement",
      "metal_folding_chairs_requested",
      "kitchen_use",
      "drip_coffee_only",
      "espresso_drinks",
    ].includes(field)) payload[field] = cleanBoolean(value);
    else if (["single_date", "multi_start_date", "multi_end_date", "recurring_start_date"].includes(field)) payload[field] = cleanString(value, 40) || null;
    else payload[field] = cleanString(value, field === "description" || field === "additional_information" ? 4000 : 1000);
  }
  if (payload.email) payload.email = String(payload.email).toLowerCase();
  return payload;
}

function publicRequestSelect() {
  return [
    "id",
    "status",
    "event_name",
    "event_format",
    "event_timing",
    "single_date",
    "single_start_time",
    "single_end_time",
    "multi_start_date",
    "multi_end_date",
    "multi_start_time",
    "multi_end_time",
    "recurring_start_date",
    "recurring_start_time",
    "recurring_end_time",
    "recurring_frequency",
    "setup_datetime",
    "description",
    "contact_name",
    "phone",
    "email",
    "location_scope",
    "location_areas",
    "graphics_reference",
    "av_request",
    "av_request_details",
    "tables_needed",
    "tables_6ft_rectangular",
    "tables_8ft_rectangular",
    "tables_5ft_round",
    "black_vinyl_tablecloths",
    "white_linen_tablecloths",
    "white_linen_agreement",
    "pipe_and_drape",
    "metal_folding_chairs_requested",
    "metal_folding_chairs",
    "sanctuary_chairs",
    "kitchen_use",
    "drip_coffee_only",
    "espresso_drinks",
    "additional_information",
    "submitted_on",
    "signature",
    "created_at",
    "public_comments",
  ].join(",");
}

async function getSharedRequest(adminClient: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await adminClient
    .from("event_requests")
    .select(publicRequestSelect())
    .eq("public_access_token", token)
    .eq("public_access_enabled", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const body = await req.json();
    const action = cleanString(body?.action, 40) || "get";
    const token = cleanString(body?.token, 120);
    if (!token) return jsonResponse(400, { error: "Share token is required." });

    const adminClient = getAdminClient();
    const current = await getSharedRequest(adminClient, token);
    if (!current?.id) return jsonResponse(404, { error: "This event request link is no longer available." });

    if (action === "get") {
      return jsonResponse(200, { request: current });
    }

    if (action === "update") {
      if (current.status !== "new") {
        return jsonResponse(403, { error: "This request can no longer be edited because it has already been reviewed." });
      }
      const form = body?.eventForm && typeof body.eventForm === "object" ? body.eventForm as Record<string, unknown> : {};
      const updatePayload = sanitizeUpdatePayload(form);
      const { data, error } = await adminClient
        .from("event_requests")
        .update(updatePayload)
        .eq("id", current.id)
        .select(publicRequestSelect())
        .single();
      if (error) throw error;
      return jsonResponse(200, { request: data });
    }

    if (action === "comment") {
      const authorName = cleanString(body?.authorName || current.contact_name, 160) || "Requester";
      const authorEmail = cleanString(body?.authorEmail || current.email, 254).toLowerCase();
      const bodyText = cleanString(body?.body, 3000);
      if (!bodyText) return jsonResponse(400, { error: "Comment cannot be empty." });
      const nextComment = {
        id: crypto.randomUUID(),
        author: authorName,
        email: authorEmail,
        role: "requester",
        body: bodyText,
        created_at: new Date().toISOString(),
      };
      const nextComments = [...(Array.isArray(current.public_comments) ? current.public_comments : []), nextComment];
      const { data, error } = await adminClient
        .from("event_requests")
        .update({ public_comments: nextComments })
        .eq("id", current.id)
        .select(publicRequestSelect())
        .single();
      if (error) throw error;
      return jsonResponse(200, { request: data });
    }

    return jsonResponse(400, { error: "Unsupported share action." });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Event request share failed." });
  }
});
