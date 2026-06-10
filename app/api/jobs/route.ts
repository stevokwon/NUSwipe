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

// POST: Add a new job opening (restricted to employers)
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch employer profile to verify role
  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .select("id")
    .eq("id", user.id)
    .single();

  if (employerError || !employer) {
    return NextResponse.json(
      { error: "Forbidden: Only employers can post jobs" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      company,
      role,
      location,
      division,
      salary_range,
      description,
      visa_sponsorship,
      ats_type,
      ats_board_token,
      ats_job_id,
      ats_fallback_url,
      logo_url,
      tags,
    } = body;

    if (!company || !role || !location || !ats_type) {
      return NextResponse.json(
        { error: "company, role, location, and ats_type are required fields" },
        { status: 400 }
      );
    }

    if (ats_type === "url" && !ats_fallback_url) {
      return NextResponse.json(
        { error: "ats_fallback_url is required when ats_type is 'url'" },
        { status: 400 }
      );
    }
    if (ats_type !== "url" && (!ats_board_token || !ats_job_id)) {
      return NextResponse.json(
        {
          error:
            "ats_board_token and ats_job_id are required when using Greenhouse/Lever ATS",
        },
        { status: 400 }
      );
    }

    const jobPayload = {
      company,
      role,
      location,
      division: division || null,
      salary_range: salary_range || null,
      description: description || null,
      visa_sponsorship: !!visa_sponsorship,
      ats_type,
      ats_board_token: ats_type !== "url" ? ats_board_token : null,
      ats_job_id: ats_type !== "url" ? ats_job_id : null,
      ats_fallback_url: ats_fallback_url || null,
      logo_url: logo_url || null,
      tags: Array.isArray(tags) ? tags : [],
      posted_by: user.id,
      source: 'platform',
      active: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("jobs")
      .insert(jobPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, job: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request body" }, { status: 400 });
  }
}
