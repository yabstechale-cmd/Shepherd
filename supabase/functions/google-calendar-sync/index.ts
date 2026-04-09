import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ConnectionRow = {
  church_id: string;
  connected_by: string | null;
  google_account_email: string | null;
  refresh_token: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getRequesterProfile(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    throw new Error("The request is missing the credentials needed to verify this user.");
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user?.id) {
    throw new Error("We couldn't verify this Shepherd session.");
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, church_id, role, staff_roles, title")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile?.church_id) {
    throw new Error("We couldn't find the church profile for this user.");
  }

  return profile;
}

function canManageCalendarSettings(profile: { role?: string | null; staff_roles?: string[] | null; title?: string | null }) {
  const title = String(profile?.title || "").trim().toLowerCase();
  const roles = Array.isArray(profile?.staff_roles) ? profile.staff_roles : [];
  return profile?.role === "church_administrator"
    || profile?.role === "admin"
    || roles.includes("church_administrator")
    || title === "church administrator";
}

async function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not available to this function.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getChurchGoogleConnection(adminClient: ReturnType<typeof createClient>, churchId: string) {
  const { data, error } = await adminClient
    .from("church_google_connections")
    .select("church_id, connected_by, google_account_email, refresh_token")
    .eq("church_id", churchId)
    .maybeSingle();

  if (error) throw new Error(error.message || "We couldn't load the saved Google connection for this church.");
  if (!data?.refresh_token) {
    throw new Error("This church does not have a saved Google calendar connection yet.");
  }

  return data as ConnectionRow;
}

async function exchangeRefreshToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

  if (!clientId || !clientSecret) {
    throw new Error("Google client credentials are not configured for this function yet.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Google token refresh failed.");
  }

  return String(payload.access_token);
}

async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

  if (!clientId || !clientSecret) {
    throw new Error("Google client credentials are not configured for this function yet.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Google authorization exchange failed.");
  }

  return payload;
}

async function fetchGoogleAccountEmail(accessToken: string) {
  const payload = await fetchGoogle(accessToken, "https://www.googleapis.com/oauth2/v2/userinfo");
  return String(payload?.email || "").trim();
}

async function fetchGoogle(accessToken: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Google Calendar request failed.");
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const profile = await getRequesterProfile(req);
    if (!canManageCalendarSettings(profile)) {
      return jsonResponse(403, { error: "Only the Church Administrator can manage the shared Google calendar connection." });
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const adminClient = await getAdminClient();

    if (action === "getAuthUrl") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
      const redirectUri = String(body?.redirectUri || "").trim();
      const state = String(body?.state || "").trim();

      if (!clientId) {
        return jsonResponse(500, { error: "Google client credentials are not configured for this function yet." });
      }
      if (!redirectUri || !state) {
        return jsonResponse(400, { error: "redirectUri and state are required." });
      }

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email");
      authUrl.searchParams.set("state", state);

      return jsonResponse(200, { authUrl: authUrl.toString() });
    }

    if (action === "completeConnection") {
      const code = String(body?.code || "").trim();
      const redirectUri = String(body?.redirectUri || "").trim();
      if (!code || !redirectUri) {
        return jsonResponse(400, { error: "code and redirectUri are required." });
      }

      const tokenPayload = await exchangeAuthorizationCode(code, redirectUri);
      const refreshToken = String(tokenPayload?.refresh_token || "").trim();
      const accessToken = String(tokenPayload?.access_token || "").trim();
      if (!refreshToken) {
        return jsonResponse(400, { error: "Google did not return a refresh token. Try Connect Google again and make sure you complete the consent flow." });
      }
      const connectedEmail = accessToken ? await fetchGoogleAccountEmail(accessToken) : "";
      const { error } = await adminClient.from("church_google_connections").upsert({
        church_id: profile.church_id,
        connected_by: profile.id,
        google_account_email: connectedEmail || null,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        throw new Error(error.message || "We couldn't save the Google connection for this church.");
      }
      return jsonResponse(200, { connectedEmail: connectedEmail || null });
    }

    const connection = await getChurchGoogleConnection(adminClient, profile.church_id);
    const accessToken = await exchangeRefreshToken(connection.refresh_token);

    if (action === "listCalendars") {
      const payload = await fetchGoogle(
        accessToken,
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      );
      return jsonResponse(200, { items: payload?.items || [], connectedEmail: connection.google_account_email || null });
    }

    if (action === "listEvents") {
      const calendarId = String(body?.calendarId || "").trim();
      const timeMin = String(body?.timeMin || "").trim();
      const timeMax = String(body?.timeMax || "").trim();

      if (!calendarId || !timeMin || !timeMax) {
        return jsonResponse(400, { error: "calendarId, timeMin, and timeMax are required." });
      }

      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);

      const payload = await fetchGoogle(accessToken, url.toString());
      return jsonResponse(200, { items: payload?.items || [], connectedEmail: connection.google_account_email || null });
    }

    return jsonResponse(400, { error: "Unsupported action." });
  } catch (error) {
    console.error("google-calendar-sync error", error instanceof Error ? error.message : error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unknown error." });
  }
});
