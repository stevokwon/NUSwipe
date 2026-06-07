import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyToJob } from "@/lib/ats";
import type { Profile, Job } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { jobId } = body as { jobId?: string };

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!isProfileComplete(profile as Profile)) {
    return NextResponse.json(
      { error: "Profile incomplete. Please complete your profile before applying." },
      { status: 422 }
    );
  }

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Check for duplicate application
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You have already applied to this job." },
      { status: 409 }
    );
  }

  // Submit to ATS
  try {
    const result = await applyToJob(profile as Profile, job as Job);

    const insertPayload = {
      user_id: user.id,
      job_id: jobId,
      status: "applied" as const,
      ats_submission_id: result.kind === "redirect" ? null : result.submissionId,
    };

    if (result.kind === "redirect") {
      // Record in tracker as 'applied' (user opens job in new tab)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("applications").insert(insertPayload as any);
      return NextResponse.json({ redirect: result.url }, { status: 200 });
    }

    // Direct ATS submission succeeded — record it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("applications").insert(insertPayload as any);

    return NextResponse.json(
      { success: true, submissionId: result.submissionId },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
