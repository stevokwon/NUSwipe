import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data: connection, error } = await service
    .from("calendar_connections")
    .select("provider_account_email, calendar_id, last_synced_at")
    .eq("employer_id", user.id)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: Boolean(connection),
    providerAccountEmail: connection?.provider_account_email ?? null,
    calendarId: connection?.calendar_id ?? null,
    lastSyncedAt: connection?.last_synced_at ?? null,
  });
}
