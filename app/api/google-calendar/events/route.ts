import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  createGoogleCalendarEvent,
  refreshGoogleAccessToken,
} from "@/lib/google-calendar";

type EventBody = {
  title?: string;
  date?: string;
  start?: string;
  end?: string;
  timezone?: string;
};

function combineDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: connection, error: connectionError } = await service
    .from("calendar_connections")
    .select("*")
    .eq("employer_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (connectionError) return NextResponse.json({ error: connectionError.message }, { status: 500 });
  if (!connection) return NextResponse.json({ error: "Google Calendar not connected" }, { status: 409 });

  let accessToken = connection.access_token;
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const shouldRefresh = !expiresAt || expiresAt <= Date.now() + 60_000;

  if (shouldRefresh) {
    if (!connection.refresh_token) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 409 });
    }
    const refreshed = await refreshGoogleAccessToken(connection.refresh_token);
    accessToken = refreshed.access_token;
    await service.from("calendar_connections").update({
      access_token: accessToken,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("employer_id", user.id).eq("provider", "google");
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin") ?? new Date().toISOString();
  const timeMax = searchParams.get("timeMax") ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const calendarId = encodeURIComponent(connection.calendar_id ?? "primary");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.error?.message ?? "Failed to fetch events" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ items: data.items ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as EventBody;
  const title = body.title?.trim();
  const date = body.date?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();
  const timezone = body.timezone?.trim() || "Asia/Singapore";

  if (!title || !date || !start || !end) {
    return NextResponse.json(
      { error: "title, date, start, and end are required" },
      { status: 400 }
    );
  }

  const { data: connection, error: connectionError } = await service
    .from("calendar_connections")
    .select("*")
    .eq("employer_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 500 });
  }

  if (!connection) {
    return NextResponse.json({ error: "Google Calendar is not connected" }, { status: 409 });
  }

  let accessToken = connection.access_token;
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const shouldRefresh = !expiresAt || expiresAt <= Date.now() + 60_000;

  if (shouldRefresh) {
    if (!connection.refresh_token) {
      return NextResponse.json(
        { error: "Google Calendar connection is missing a refresh token" },
        { status: 409 }
      );
    }

    const refreshed = await refreshGoogleAccessToken(connection.refresh_token);
    accessToken = refreshed.access_token;

    const { error: refreshUpdateError } = await service
      .from("calendar_connections")
      .update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        scope: refreshed.scope ?? connection.scope,
        token_type: refreshed.token_type ?? connection.token_type,
        updated_at: new Date().toISOString(),
      })
      .eq("employer_id", user.id)
      .eq("provider", "google");

    if (refreshUpdateError) {
      return NextResponse.json({ error: refreshUpdateError.message }, { status: 500 });
    }
  }

  const event = await createGoogleCalendarEvent(accessToken, connection.calendar_id ?? "primary", {
    summary: title,
    startDateTime: combineDateTime(date, start),
    endDateTime: combineDateTime(date, end),
    timeZone: timezone,
  });

  const { error: syncUpdateError } = await service
    .from("calendar_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("employer_id", user.id)
    .eq("provider", "google");

  if (syncUpdateError) {
    return NextResponse.json({ error: syncUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: event.id,
    htmlLink: event.htmlLink ?? null,
    status: event.status ?? "confirmed",
  });
}
