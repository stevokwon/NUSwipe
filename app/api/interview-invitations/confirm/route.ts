import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createGoogleCalendarEvent, refreshGoogleAccessToken } from "@/lib/google-calendar";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function refreshMsToken(refreshToken: string) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "Calendars.ReadWrite offline_access",
    }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
}

async function getValidToken(userId: string, service: ReturnType<typeof createServiceRoleClient>) {
  const { data: conn } = await service
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn) return null;

  if (conn.provider === "google") {
    const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
    if (expiresAt > Date.now() + 60_000) return { token: conn.access_token, provider: "google", conn };
    if (!conn.refresh_token) return null;
    const refreshed = await refreshGoogleAccessToken(conn.refresh_token);
    await service.from("calendar_connections").update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return { token: refreshed.access_token, provider: "google", conn: { ...conn, access_token: refreshed.access_token } };
  }

  if (conn.provider === "microsoft") {
    if (conn.expires_at && new Date(conn.expires_at) > new Date(Date.now() + 60_000)) {
    return { token: conn.access_token, provider: "microsoft", conn };
    }
    if (!conn.refresh_token) return null;
    const refreshed = await refreshMsToken(conn.refresh_token);
    if (!refreshed) return null;
    await service.from("calendar_connections").update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? conn.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return { token: refreshed.access_token, provider: "microsoft", conn };
  }

  return null;
}

async function addToCalendar(
  userId: string,
  provider: string,
  token: string,
  conn: Record<string, string>,
  title: string,
  startTime: string,
  endTime: string,
  service: ReturnType<typeof createServiceRoleClient>
) {
  if (provider === "google") {
    await createGoogleCalendarEvent(token, conn.calendar_id ?? "primary", {
      summary: title,
      startDateTime: startTime,
      endDateTime: endTime,
      timeZone: "Asia/Singapore",
    });
  } else if (provider === "microsoft") {
    await fetch(`${GRAPH_BASE}/me/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: title,
        start: { dateTime: startTime, timeZone: "Singapore Standard Time" },
        end: { dateTime: endTime, timeZone: "Singapore Standard Time" },
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invitation_id, slot_id } = await req.json();
  if (!invitation_id || !slot_id) {
    return NextResponse.json({ error: "invitation_id and slot_id are required" }, { status: 400 });
  }

  // Fetch invitation
  const { data: invitation, error: invErr } = await service
    .from("interview_invitations")
    .select("*")
    .eq("id", invitation_id)
    .eq("candidate_id", user.id)
    .maybeSingle();

  if (invErr || !invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.status === "accepted") return NextResponse.json({ error: "Already confirmed" }, { status: 409 });

  // Fetch slot and verify it's still available
  const { data: slot, error: slotErr } = await service
    .from("interview_slots")
    .select("*")
    .eq("id", slot_id)
    .eq("employer_id", invitation.employer_id)
    .eq("is_booked", false)
    .maybeSingle();

  if (slotErr || !slot) return NextResponse.json({ error: "Slot unavailable" }, { status: 409 });

  const title = `Interview`;

  // Add to candidate's calendar
  const candidateCal = await getValidToken(user.id, service);
  if (candidateCal) {
    await addToCalendar(
      user.id, candidateCal.provider, candidateCal.token,
      candidateCal.conn as Record<string, string>,
      title, slot.start_time, slot.end_time, service
    );
  }

  // Add to employer's calendar
  const employerCal = await getValidToken(invitation.employer_id, service);
  if (employerCal) {
    await addToCalendar(
      invitation.employer_id, employerCal.provider, employerCal.token,
      employerCal.conn as Record<string, string>,
      title, slot.start_time, slot.end_time, service
    );
  }

  // Mark slot as booked
  await service.from("interview_slots").update({ is_booked: true }).eq("id", slot_id);

  // Update invitation
    await (service.from("interview_invitations") as any).update({
    slot_id,
    status: "accepted",
    updated_at: new Date().toISOString(),
    }).eq("id", invitation_id);

  // Update application status to interviewing
  await service.from("applications").update({
    status: "interviewing",
    updated_at: new Date().toISOString(),
  }).eq("id", invitation.application_id);

  return NextResponse.json({ success: true });
}