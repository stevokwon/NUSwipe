import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET — fetch all slots for the current employer
export async function GET() {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await service
    .from("interview_slots")
    .select("*")
    .eq("employer_id", user.id)
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data ?? [] });
}

// POST — create a new slot
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { start_time, end_time } = body;

  if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
  }

  const { data, error } = await service
    .from("interview_slots")
    .insert({ employer_id: user.id, start_time, end_time })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slot: data });
}

// DELETE — remove a slot
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get("slotId");
  if (!slotId) return NextResponse.json({ error: "slotId is required" }, { status: 400 });

  const { error } = await service
    .from("interview_slots")
    .delete()
    .eq("id", slotId)
    .eq("employer_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}