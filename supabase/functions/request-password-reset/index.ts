import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

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

function sanitizePlainText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateRedirectUri(rawValue: unknown) {
  const fallback = `${(Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").replace(/\/+$/, "")}/password-recovery`;
  const value = sanitizePlainText(rawValue || fallback, 400);
  const expectedOrigin = new URL(Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com").origin;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("The password reset redirect is invalid.");
  }
  if (parsed.origin !== expectedOrigin || parsed.pathname !== "/password-recovery") {
    throw new Error("The password reset redirect must stay on Shepherd.");
  }
  return parsed.toString();
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function getPublicAuthClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase public credentials are not configured.");
  }
  return createClient(supabaseUrl, anonKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({}));
    const churchId = sanitizePlainText(body?.churchId, 80);
    const staffId = sanitizePlainText(body?.staffId, 80);
    const redirectTo = validateRedirectUri(body?.redirectTo);

    if (!isUuid(churchId) || !isUuid(staffId)) {
      return jsonResponse(400, { error: "A valid church and staff selection are required." });
    }

    const adminClient = getAdminClient();
    const { data: staffRow, error: staffError } = await adminClient
      .from("church_staff")
      .select("id, church_id, email, auth_user_id")
      .eq("id", staffId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (staffError) {
      return jsonResponse(500, { error: staffError.message });
    }
    if (!staffRow?.id) {
      return jsonResponse(404, { error: "We couldn't find that church account." });
    }
    if (!staffRow.email || !staffRow.auth_user_id) {
      return jsonResponse(400, { error: "That person has not registered yet. Use First Time Log In instead." });
    }

    const publicAuthClient = getPublicAuthClient();
    const { error: resetError } = await publicAuthClient.auth.resetPasswordForEmail(staffRow.email, {
      redirectTo,
    });

    if (resetError) {
      return jsonResponse(400, { error: resetError.message || "We couldn't send that reset email." });
    }

    return jsonResponse(200, { sent: true });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Password reset request failed." });
  }
});
