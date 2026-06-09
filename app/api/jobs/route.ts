import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Explicit column list — mirrors jobs table in 001_init.sql.
// Excludes DB-internal `active` (filtered server-side) to keep the response lean.
const JOB_COLUMNS =
  "id, company, role, location, division, description, visa_sponsorship, " +
  "salary_range, ats_type, ats_board_token, ats_job_id, ats_fallback_url, " +
  "logo_url, tags, created_at";

// Returns active jobs the user hasn't applied to or skipped yet.
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch IDs the user has already seen (applied or skipped) — two-table lookup
  const [appliedRes, skippedRes] = await Promise.all([
    supabase.from("applications").select("job_id").eq("user_id", user.id),
    supabase.from("skipped_jobs").select("job_id").eq("user_id", user.id),
  ]);

  const seenIds = [
    ...((appliedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
    ...((skippedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
  ];

  // Exclude seen jobs at DB level — avoids fetching rows only to discard them.
  const baseQuery = supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("active", true);

  const filteredQuery =
    seenIds.length > 0
      ? baseQuery.not("id", "in", `(${seenIds.join(",")})`)
      : baseQuery;

  const { data: jobs, error } = await filteredQuery.order("created_at", {
    ascending: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}
