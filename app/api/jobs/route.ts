import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

// Returns jobs the user hasn't applied to or skipped yet
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get job IDs the user has already seen (applied or skipped)
  const [appliedRes, skippedRes] = await Promise.all([
    supabase.from("applications").select("job_id").eq("user_id", user.id),
    supabase.from("skipped_jobs").select("job_id").eq("user_id", user.id),
  ]);

  const seenIds = new Set<string>([
    ...((appliedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
    ...((skippedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
  ]);

  // Fetch active jobs not yet seen
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = ((jobs ?? []) as Job[]).filter((j) => !seenIds.has(j.id));

  return NextResponse.json({ jobs: filtered });
}
