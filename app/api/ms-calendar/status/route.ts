// app/api/ms-calendar/status/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn } = await supabase
    .from("calendar_connections")
    .select("provider, updated_at")
    .eq("employer_id", user.id)
    .eq("provider", "microsoft")
    .maybeSingle();

  return NextResponse.json({
    connected: !!conn,
    lastSyncedAt: conn?.updated_at ?? null,
  });
}