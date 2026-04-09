import "@supabase/functions-js/edge-runtime.d.ts";

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

async function fetchGoogle(providerToken: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
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
    const body = await req.json();
    const action = String(body?.action || "");
    const providerToken = String(body?.providerToken || "").trim();

    if (!providerToken) {
      return jsonResponse(400, { error: "A Google provider token is required." });
    }

    if (action === "listCalendars") {
      const payload = await fetchGoogle(
        providerToken,
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      );
      return jsonResponse(200, { items: payload?.items || [] });
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

      const payload = await fetchGoogle(providerToken, url.toString());
      return jsonResponse(200, { items: payload?.items || [] });
    }

    return jsonResponse(400, { error: "Unsupported action." });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unknown error." });
  }
});
