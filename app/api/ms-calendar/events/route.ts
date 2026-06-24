// app/api/ms-calendar/events/route.ts
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
} | null> {
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Calendars.ReadWrite offline_access User.Read",
      }),
    }
  );
  if (!res.ok) return null;
  const tokens = await res.json();
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
}

// ─── Get a valid access token for the current user ───────────────────────────

async function getValidToken(userId: string): Promise<string | null> {
  const service = createServiceRoleClient();

  const { data: conn, error } = await service
    .from("calendar_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("employer_id", userId)
    .eq("provider", "microsoft")
    .single();

  if (error || !conn) return null;

  // Still valid with a 60-second buffer
  if (new Date(conn.expires_at) > new Date(Date.now() + 60_000)) {
    return conn.access_token;
  }

  // Needs refresh
  if (!conn.refresh_token) return null;
  const refreshed = await refreshAccessToken(conn.refresh_token);
  if (!refreshed) return null;

  await service
    .from("calendar_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? conn.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("employer_id", userId)
    .eq("provider", "microsoft");

  return refreshed.access_token;
}

// ─── GET /api/ms-calendar/events ─────────────────────────────────────────────
// Query params: timeMin (ISO), timeMax (ISO)

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getValidToken(user.id);
  if (!token)
    return NextResponse.json(
      { error: "Microsoft Calendar not connected" },
      { status: 400 }
    );

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  // Build the Graph API query
  const params = new URLSearchParams({
    $orderby: "start/dateTime",
    $top: "50",
    $select: "id,subject,start,end,webLink,categories,bodyPreview",
  });
  if (timeMin) params.set("startDateTime", timeMin);
  if (timeMax) params.set("endDateTime", timeMax);

  const res = await fetch(
    `${GRAPH_BASE}/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Required for calendarView — tells Graph which timezone to use for
        // the dateTime boundaries (UTC keeps it predictable).
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error?.message ?? "Failed to fetch events" },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Normalise to the same shape the UI already knows from Google Calendar
  // so you don't have to rewrite all the rendering logic.
  const items = (data.value ?? []).map((e: MsEvent) => normalise(e));

  return NextResponse.json({ items });
}

// ─── POST /api/ms-calendar/events ────────────────────────────────────────────
// Body: { title, date, start, end }   (date: YYYY-MM-DD, start/end: HH:MM)

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getValidToken(user.id);
  if (!token)
    return NextResponse.json(
      { error: "Microsoft Calendar not connected" },
      { status: 400 }
    );

  const body = await request.json();
  const { title, date, start, end } = body as {
    title: string;
    date: string;
    start: string;
    end: string;
  };

  if (!title || !date || !start || !end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = {
    subject: title,
    start: {
      dateTime: `${date}T${start}:00`,
      timeZone: "Singapore Standard Time",
    },
    end: {
      dateTime: `${date}T${end}:00`,
      timeZone: "Singapore Standard Time",
    },
  };

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error?.message ?? "Failed to create event" },
      { status: res.status }
    );
  }

  const created: MsEvent = await res.json();
  return NextResponse.json({ id: created.id, htmlLink: created.webLink });
}

// ─── Types & normalisation ────────────────────────────────────────────────────

type MsEvent = {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  webLink?: string;
  categories?: string[];
};

/**
 * Map a Microsoft Graph event to the GoogleCalendarEvent shape the UI uses,
 * so the calendar grid and event list require zero changes.
 *
 * colorId is derived from the first Outlook category colour name (if set).
 * We pick a stable numeric string so getEventBarColor / getEventColor work.
 */
function normalise(e: MsEvent) {
  return {
    id: e.id,
    summary: e.subject,
    start: { dateTime: e.start.dateTime ? toUtcIso(e.start.dateTime, e.start.timeZone) : undefined },
    end:   { dateTime: e.end.dateTime   ? toUtcIso(e.end.dateTime,   e.end.timeZone)   : undefined },
    htmlLink: e.webLink ?? null,
    colorId: categoryToColorId(e.categories?.[0]),
    _provider: "microsoft" as const,
  };
}

/** Convert a Graph dateTime + timeZone to a UTC ISO string that Date() can parse. */
function toUtcIso(dateTime: string, _timeZone: string): string {
  // Graph returns dateTime without a timezone suffix (e.g. "2025-07-01T09:00:00")
  // when using calendarView with Prefer: outlook.timezone="UTC".
  // Append Z so the JS Date constructor treats it as UTC.
  if (!dateTime.endsWith("Z") && !dateTime.includes("+")) return dateTime + "Z";
  return dateTime;
}

/** Map Outlook category colour names to the numeric colorId strings the UI already handles. */
function categoryToColorId(category?: string): string | undefined {
  if (!category) return undefined;
  const map: Record<string, string> = {
    red: "11",
    orange: "6",
    yellow: "5",
    green: "10",
    teal: "7",
    cyan: "7",
    blue: "9",
    purple: "3",
    lavender: "3",
    maroon: "4",
    olive: "2",
    steel: "8",
    gray: "8",
    grey: "8",
  };
  const key = category.toLowerCase().split(" ")[0];
  return map[key];
}