import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequesterProfile = {
  id: string;
  church_id: string;
  role: string | null;
  staff_roles: string[] | null;
  title: string | null;
  full_name: string | null;
  email: string | null;
};

type ConnectionRow = {
  church_id: string;
  connected_by: string | null;
  google_account_email: string | null;
  refresh_token: string;
};

type ChurchRow = {
  id: string;
  name: string | null;
  google_calendar_id: string | null;
  google_calendar_title: string | null;
  google_calendar_last_synced_at: string | null;
  google_calendar_last_sync_error: string | null;
};

type CalendarEventRow = {
  id: string;
  church_id: string;
  created_by: string | null;
  linked_event_request_id: string | null;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  sync_to_google: boolean | null;
  google_calendar_source_id: string | null;
  google_calendar_source_title: string | null;
  google_calendar_source_event_id: string | null;
  google_last_synced_at: string | null;
  notes: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getGoogleSyncJobSecret() {
  return sanitizePlainText(
    Deno.env.get("SHEPHERD_GOOGLE_SYNC_SECRET")
    || Deno.env.get("SHEPHERD_BULK_EMAIL_SECRET")
    || "",
    200,
  );
}

function assertValidSyncJobSecret(req: Request) {
  const expected = getGoogleSyncJobSecret();
  const received = sanitizePlainText(req.headers.get("x-shepherd-job-secret") || "", 200);
  if (!expected) {
    throw new Error("The Google Calendar sync job secret is not configured.");
  }
  if (!received || received !== expected) {
    throw new Error("The Google Calendar sync job secret is invalid.");
  }
}

function sanitizePlainText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function getExpectedAppOrigin() {
  const appUrl = sanitizePlainText(Deno.env.get("SHEPHERD_APP_URL") || "https://shepherd-s.com", 200);
  return new URL(appUrl).origin;
}

function getAppTimeZone() {
  return sanitizePlainText(Deno.env.get("SHEPHERD_TIMEZONE") || "America/New_York", 100);
}

function validateRedirectUri(rawValue: unknown) {
  const value = sanitizePlainText(rawValue, 400);
  if (!value) {
    throw new Error("redirectUri is required.");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("redirectUri must be a valid URL.");
  }
  if (parsed.origin !== getExpectedAppOrigin()) {
    throw new Error("redirectUri must stay on the Shepherd app domain.");
  }
  return parsed.toString();
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
    .select("id, church_id, role, staff_roles, title, full_name, email")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile?.church_id) {
    throw new Error("We couldn't find the church profile for this user.");
  }

  return profile as RequesterProfile;
}

function canManageCalendarSettings(profile: RequesterProfile) {
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

async function getChurchRecord(adminClient: ReturnType<typeof createClient>, churchId: string) {
  const { data, error } = await adminClient
    .from("churches")
    .select("id, name, google_calendar_id, google_calendar_title, google_calendar_last_synced_at, google_calendar_last_sync_error")
    .eq("id", churchId)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message || "We couldn't load this church's calendar settings.");
  }

  return data as ChurchRow;
}

function getOfficialCalendarId(church: ChurchRow) {
  const calendarId = sanitizePlainText(church.google_calendar_id, 300);
  if (!calendarId) {
    throw new Error("This church does not have an official Google calendar selected yet.");
  }
  return calendarId;
}

async function updateChurchSyncStatus(
  adminClient: ReturnType<typeof createClient>,
  churchId: string,
  {
    syncedAt = null,
    errorMessage = null,
  }: {
    syncedAt?: string | null;
    errorMessage?: string | null;
  },
) {
  const payload: Record<string, string | null> = {
    google_calendar_last_sync_error: errorMessage || null,
  };
  if (syncedAt) {
    payload.google_calendar_last_synced_at = syncedAt;
  }
  await adminClient
    .from("churches")
    .update(payload)
    .eq("id", churchId);
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

async function googleRequest(accessToken: string, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error_description || "Google Calendar request failed.");
  }
  return payload;
}

async function fetchGoogleAccountEmail(accessToken: string) {
  const payload = await googleRequest(accessToken, "https://www.googleapis.com/oauth2/v2/userinfo");
  return String(payload?.email || "").trim();
}

function combineNotesWithGoogleDescription(notes: string | null, linkedEventRequestId: string | null) {
  const parts = [sanitizePlainText(notes, 8000)];
  if (linkedEventRequestId) {
    parts.push(`shepherd-event-request-id:${linkedEventRequestId}`);
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

function buildGoogleEventPayload(event: CalendarEventRow) {
  const description = combineNotesWithGoogleDescription(event.notes, event.linked_event_request_id);
  const timeZone = getAppTimeZone();
  const title = sanitizePlainText(event.title, 200) || "Shepherd calendar event";
  const location = sanitizePlainText(event.location, 300) || undefined;
  const startTime = sanitizePlainText(event.start_time, 20);
  const endTime = sanitizePlainText(event.end_time, 20);

  if (startTime && endTime) {
    return {
      summary: title,
      location,
      description: description || undefined,
      start: {
        dateTime: `${event.event_date}T${startTime}:00`,
        timeZone,
      },
      end: {
        dateTime: `${event.event_date}T${endTime}:00`,
        timeZone,
      },
    };
  }

  const nextDay = new Date(`${event.event_date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;

  return {
    summary: title,
    location,
    description: description || undefined,
    start: {
      date: event.event_date,
    },
    end: {
      date: endDate,
    },
  };
}

function getGoogleEventDate(value: string | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function getGoogleEventTime(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function stripGoogleSyncMetadata(notes: string | null) {
  return String(notes || "")
    .split(/\n+/)
    .filter((line) => !line.trim().startsWith("shepherd-event-request-id:"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapGoogleEventToLocalRow(existing: CalendarEventRow | null, event: Record<string, any>, church: ChurchRow, fallbackProfileId: string | null) {
  return {
    ...(existing?.id ? { id: existing.id } : {}),
    church_id: church.id,
    created_by: existing?.created_by || fallbackProfileId,
    linked_event_request_id: existing?.linked_event_request_id || null,
    title: sanitizePlainText(event.summary || "Google calendar event", 200),
    event_date: getGoogleEventDate(event.start?.dateTime || event.start?.date),
    start_time: event.start?.dateTime ? getGoogleEventTime(event.start.dateTime) : null,
    end_time: event.end?.dateTime ? getGoogleEventTime(event.end.dateTime) : null,
    location: sanitizePlainText(event.location, 300) || null,
    sync_to_google: true,
    google_calendar_source_id: church.google_calendar_id,
    google_calendar_source_title: church.google_calendar_title || `${church.name || "Church"} Google Calendar`,
    google_calendar_source_event_id: sanitizePlainText(event.id, 200) || null,
    google_last_synced_at: new Date().toISOString(),
    notes: stripGoogleSyncMetadata(event.description || "") || null,
    updated_at: new Date().toISOString(),
  };
}

async function recordSyncActivity(
  adminClient: ReturnType<typeof createClient>,
  payload: {
    churchId: string;
    actorProfileId?: string | null;
    actorName?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    entityTitle?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  await adminClient.from("activity_logs").insert({
    church_id: payload.churchId,
    actor_profile_id: payload.actorProfileId || null,
    actor_name: payload.actorName || null,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId || null,
    entity_title: payload.entityTitle || null,
    summary: payload.summary,
    metadata: payload.metadata || {},
  });
}

async function fetchAllOfficialCalendarEvents(accessToken: string, calendarId: string) {
  const timeMin = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();
  const timeMax = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString();
  const items: Record<string, any>[] = [];
  let pageToken = "";

  while (true) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("orderBy", "updated");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", "2500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await googleRequest(accessToken, url.toString());
    items.push(...(Array.isArray(payload?.items) ? payload.items : []));
    if (!payload?.nextPageToken) break;
    pageToken = String(payload.nextPageToken);
  }

  return items;
}

async function syncOfficialCalendarToShepherd(
  adminClient: ReturnType<typeof createClient>,
  accessToken: string,
  church: ChurchRow,
  profile: RequesterProfile,
) {
  const calendarId = getOfficialCalendarId(church);
  const { data: existingRows, error } = await adminClient
    .from("calendar_events")
    .select("*")
    .eq("church_id", church.id)
    .eq("google_calendar_source_id", calendarId);

  if (error) {
    throw new Error(error.message || "We couldn't load the current Shepherd calendar rows for sync.");
  }

  const existingByGoogleId = new Map(
    ((existingRows || []) as CalendarEventRow[])
      .filter((row) => row.google_calendar_source_event_id)
      .map((row) => [row.google_calendar_source_event_id as string, row]),
  );

  const googleEvents = await fetchAllOfficialCalendarEvents(accessToken, calendarId);
  const activeRows = [];
  const deletedRows = [];

  for (const item of googleEvents) {
    const googleEventId = sanitizePlainText(item?.id, 200);
    if (!googleEventId) continue;
    const existingRow = existingByGoogleId.get(googleEventId) || null;

    if (item.status === "cancelled") {
      if (existingRow?.id) {
        await adminClient.from("calendar_events").delete().eq("id", existingRow.id);
        deletedRows.push(existingRow.id);
        await recordSyncActivity(adminClient, {
          churchId: church.id,
          action: "deleted",
          entityType: "calendar_event",
          entityId: existingRow.id,
          entityTitle: existingRow.title,
          summary: `${existingRow.title || "A calendar event"} was deleted via Google Calendar sync.`,
          metadata: { source: "google_sync", google_event_id: googleEventId },
        });
      }
      continue;
    }

    const mappedRow = mapGoogleEventToLocalRow(existingRow, item, church, profile.id);
    activeRows.push(mappedRow);
  }

  const savedRows = [];
  if (activeRows.length) {
    const { data, error: upsertError } = await adminClient
      .from("calendar_events")
      .upsert(activeRows)
      .select();
    if (upsertError) {
      throw new Error(upsertError.message || "We couldn't save synced Google events into Shepherd.");
    }
    savedRows.push(...(data || []));
  }

  return {
    savedRows,
    deletedRows,
  };
}

async function syncChurchCalendar(
  adminClient: ReturnType<typeof createClient>,
  church: ChurchRow,
  connection: ConnectionRow,
  profile: RequesterProfile,
) {
  const accessToken = await exchangeRefreshToken(connection.refresh_token);
  const result = await syncOfficialCalendarToShepherd(adminClient, accessToken, church, profile);
  const syncedAt = new Date().toISOString();
  await updateChurchSyncStatus(adminClient, church.id, {
    syncedAt,
    errorMessage: null,
  });
  return {
    ...result,
    syncedAt,
  };
}

async function runScheduledChurchSync(adminClient: ReturnType<typeof createClient>) {
  const { data: connections, error } = await adminClient
    .from("church_google_connections")
    .select("church_id, connected_by, google_account_email, refresh_token")
    .not("refresh_token", "is", null);

  if (error) {
    throw new Error(error.message || "We couldn't load the churches with Google Calendar connections.");
  }

  const results: Array<Record<string, unknown>> = [];

  for (const connection of (connections || []) as ConnectionRow[]) {
    let church: ChurchRow | null = null;
    try {
      church = await getChurchRecord(adminClient, connection.church_id);
      if (!sanitizePlainText(church.google_calendar_id, 300)) {
        await updateChurchSyncStatus(adminClient, church.id, {
          errorMessage: "No official Google calendar is selected for this church yet.",
        });
        results.push({
          churchId: church.id,
          churchName: church.name || "Church",
          synced: false,
          skipped: true,
          error: "No official Google calendar is selected for this church yet.",
        });
        continue;
      }
      const profile = {
        id: connection.connected_by || "",
        church_id: church.id,
        role: "system",
        staff_roles: [],
        title: "system",
        full_name: "Shepherd Sync",
        email: null,
      } as RequesterProfile;
      const syncResult = await syncChurchCalendar(adminClient, church, connection, profile);
      results.push({
        churchId: church.id,
        churchName: church.name || "Church",
        synced: true,
        savedCount: syncResult.savedRows.length,
        deletedCount: syncResult.deletedRows.length,
        syncedAt: syncResult.syncedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error.";
      if (church?.id || connection.church_id) {
        await updateChurchSyncStatus(adminClient, church?.id || connection.church_id, {
          errorMessage: message,
        });
      }
      results.push({
        churchId: church?.id || connection.church_id,
        churchName: church?.name || "Church",
        synced: false,
        error: message,
      });
    }
  }

  return results;
}

async function fetchCalendarEvent(
  adminClient: ReturnType<typeof createClient>,
  churchId: string,
  calendarEventId: string,
) {
  const { data, error } = await adminClient
    .from("calendar_events")
    .select("*")
    .eq("church_id", churchId)
    .eq("id", calendarEventId)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(error?.message || "We couldn't find that Shepherd calendar event.");
  }

  return data as CalendarEventRow;
}

async function upsertOfficialCalendarEvent(
  adminClient: ReturnType<typeof createClient>,
  accessToken: string,
  church: ChurchRow,
  profile: RequesterProfile,
  calendarEventId: string,
) {
  const localEvent = await fetchCalendarEvent(adminClient, church.id, calendarEventId);
  const calendarId = getOfficialCalendarId(church);
  const payload = buildGoogleEventPayload(localEvent);
  const endpointBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const googlePayload = localEvent.google_calendar_source_event_id
    ? await googleRequest(accessToken, `${endpointBase}/${encodeURIComponent(localEvent.google_calendar_source_event_id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    : await googleRequest(accessToken, endpointBase, {
        method: "POST",
        body: JSON.stringify(payload),
      });

  const { data, error } = await adminClient
    .from("calendar_events")
    .update({
      sync_to_google: true,
      google_calendar_source_id: calendarId,
      google_calendar_source_title: church.google_calendar_title || `${church.name || "Church"} Google Calendar`,
      google_calendar_source_event_id: sanitizePlainText(googlePayload?.id, 200) || localEvent.google_calendar_source_event_id,
      google_last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", localEvent.id)
    .select()
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "We couldn't finish linking this Shepherd event to Google Calendar.");
  }

  return data as CalendarEventRow;
}

async function deleteOfficialCalendarEvent(
  adminClient: ReturnType<typeof createClient>,
  accessToken: string,
  church: ChurchRow,
  profile: RequesterProfile,
  calendarEventId: string,
) {
  const localEvent = await fetchCalendarEvent(adminClient, church.id, calendarEventId);
  const calendarId = getOfficialCalendarId(church);

  if (localEvent.google_calendar_source_event_id) {
    await googleRequest(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(localEvent.google_calendar_source_event_id)}`,
      { method: "DELETE" },
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error || "");
      if (!/not found/i.test(message)) throw error;
    });
  }

  const { error } = await adminClient
    .from("calendar_events")
    .delete()
    .eq("id", localEvent.id);

  if (error) {
    throw new Error(error.message || "We couldn't remove this Shepherd calendar event.");
  }

  await recordSyncActivity(adminClient, {
    churchId: church.id,
    actorProfileId: profile.id,
    actorName: profile.full_name || profile.email || "Staff",
    action: "deleted",
    entityType: "calendar_event",
    entityId: localEvent.id,
    entityTitle: localEvent.title,
    summary: `${profile.full_name || "A staff member"} deleted calendar event "${localEvent.title}" from Shepherd.`,
    metadata: {
      source: "shepherd",
      google_event_id: localEvent.google_calendar_source_event_id,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const adminClient = await getAdminClient();

    if (action === "syncAllChurches") {
      assertValidSyncJobSecret(req);
      const results = await runScheduledChurchSync(adminClient);
      return jsonResponse(200, {
        synced: true,
        churchCount: results.length,
        successCount: results.filter((entry) => entry.synced === true).length,
        failureCount: results.filter((entry) => entry.synced === false && !entry.skipped).length,
        skippedCount: results.filter((entry) => entry.skipped === true).length,
        churches: results,
      });
    }

    const profile = await getRequesterProfile(req);

    if (action === "getAuthUrl" || action === "completeConnection" || action === "disconnectConnection" || action === "listCalendars") {
      if (!canManageCalendarSettings(profile)) {
        return jsonResponse(403, { error: "Only the Church Administrator can manage the shared Google calendar connection." });
      }
    }

    if (action === "getAuthUrl") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
      const redirectUri = validateRedirectUri(body?.redirectUri);
      const state = sanitizePlainText(body?.state, 200);

      if (!clientId) {
        return jsonResponse(500, { error: "Google client credentials are not configured for this function yet." });
      }
      if (!state) {
        return jsonResponse(400, { error: "state is required." });
      }

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email");
      authUrl.searchParams.set("state", state);

      return jsonResponse(200, { authUrl: authUrl.toString() });
    }

    if (action === "getConnectionStatus") {
      const { data, error } = await adminClient
        .from("church_google_connections")
        .select("church_id, google_account_email")
        .eq("church_id", profile.church_id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message || "We couldn't load the saved Google connection for this church.");
      }
      return jsonResponse(200, {
        connected: !!data?.church_id,
        connectedEmail: data?.google_account_email || null,
      });
    }

    if (action === "completeConnection") {
      const code = sanitizePlainText(body?.code, 400);
      const redirectUri = validateRedirectUri(body?.redirectUri);
      if (!code) {
        return jsonResponse(400, { error: "code is required." });
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

    if (action === "disconnectConnection") {
      const { error } = await adminClient
        .from("church_google_connections")
        .delete()
        .eq("church_id", profile.church_id);
      if (error) {
        throw new Error(error.message || "We couldn't disconnect Google for this church.");
      }
      return jsonResponse(200, { disconnected: true });
    }

    const connection = await getChurchGoogleConnection(adminClient, profile.church_id);
    const church = await getChurchRecord(adminClient, profile.church_id);

    if (action === "listCalendars") {
      const accessToken = await exchangeRefreshToken(connection.refresh_token);
      const payload = await googleRequest(
        accessToken,
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      );
      return jsonResponse(200, { items: payload?.items || [], connectedEmail: connection.google_account_email || null });
    }

    if (action === "upsertCalendarEvent") {
      const calendarEventId = sanitizePlainText(body?.calendarEventId, 200);
      if (!calendarEventId) {
        return jsonResponse(400, { error: "calendarEventId is required." });
      }
      const accessToken = await exchangeRefreshToken(connection.refresh_token);
      const saved = await upsertOfficialCalendarEvent(adminClient, accessToken, church, profile, calendarEventId);
      return jsonResponse(200, { event: saved });
    }

    if (action === "deleteCalendarEvent") {
      const calendarEventId = sanitizePlainText(body?.calendarEventId, 200);
      if (!calendarEventId) {
        return jsonResponse(400, { error: "calendarEventId is required." });
      }
      const accessToken = await exchangeRefreshToken(connection.refresh_token);
      await deleteOfficialCalendarEvent(adminClient, accessToken, church, profile, calendarEventId);
      return jsonResponse(200, { deleted: true });
    }

    if (action === "syncOfficialCalendar") {
      const result = await syncChurchCalendar(adminClient, church, connection, profile);
      return jsonResponse(200, {
        synced: true,
        savedCount: result.savedRows.length,
        deletedCount: result.deletedRows.length,
        deletedIds: result.deletedRows,
        rows: result.savedRows,
        syncedAt: result.syncedAt,
      });
    }

    if (action === "listEvents") {
      const calendarId = sanitizePlainText(body?.calendarId, 300);
      const timeMin = sanitizePlainText(body?.timeMin, 100);
      const timeMax = sanitizePlainText(body?.timeMax, 100);

      if (!calendarId || !timeMin || !timeMax) {
        return jsonResponse(400, { error: "calendarId, timeMin, and timeMax are required." });
      }

      const accessToken = await exchangeRefreshToken(connection.refresh_token);
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);

      const payload = await googleRequest(accessToken, url.toString());
      return jsonResponse(200, { items: payload?.items || [], connectedEmail: connection.google_account_email || null });
    }

    return jsonResponse(400, { error: "Unsupported action." });
  } catch (error) {
    console.error("google-calendar-sync error", error instanceof Error ? error.message : error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unknown error." });
  }
});
