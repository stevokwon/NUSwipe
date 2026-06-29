import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// POST — create an invitation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employer } = await service.from("employers").select("id").eq("id", user.id).maybeSingle();
  if (!employer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { candidate_id, application_id } = await req.json();
  if (!candidate_id || !application_id) {
    return NextResponse.json({ error: "candidate_id and application_id are required" }, { status: 400 });
  }

  // Check if invitation already exists
  const { data: existing } = await service
    .from("interview_invitations")
    .select("id")
    .eq("employer_id", user.id)
    .eq("candidate_id", candidate_id)
    .eq("application_id", application_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ invitation: existing, already_exists: true });
  }

  const { data, error } = await service
    .from("interview_invitations")
    .insert({ employer_id: user.id, candidate_id, application_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitation: data });
}

// GET — fetch invitation by id (for candidate booking page)
export async function GET(req: NextRequest) {
  const service = createServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) return NextResponse.json({ error: "invitationId is required" }, { status: 400 });

  const { data: invitation, error } = await service
    .from("interview_invitations")
    .select("*, employers(id, company_name), candidates(id, first_name, last_name, email)")
    .eq("id", invitationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  // Fetch available (unbooked) slots for this employer
  const { data: slots } = await service
    .from("interview_slots")
    .select("*")
    .eq("employer_id", invitation.employer_id)
    .eq("is_booked", false)
    .order("start_time", { ascending: true });

  return NextResponse.json({ invitation, slots: slots ?? [] });
}