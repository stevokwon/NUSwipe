import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyToJob } from "@/lib/ats";
import type { Profile, Job } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";
import { checkVisaCompatibility } from "@/lib/profile";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const extensionToken = crypto.randomUUID();

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

  // Visa compatibility check — warn but do not block.
  // International students can still apply to roles without sponsorship;
  // the flag is stored on the application for candidate awareness.
  const compatibility = checkVisaCompatibility(profile as Profile, job as Job);
  const visaWarning = !compatibility.compatible ? compatibility.reason : null;

  // Submit to ATS
  try {
    const result = await applyToJob(profile as Profile, job as Job);

    const status = result.kind === "redirect" ? "pending" as const : "applied" as const;
    const insertPayload = {
      user_id: user.id,
      job_id: jobId,
      status,
      ats_submission_id: result.kind === "redirect" ? null : result.submissionId,
      visa_warning: visaWarning !== null,
      extension_token: extensionToken,
    };

    if (result.kind === "redirect") {
      // Record as 'pending' — submission unconfirmed until user completes external form
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("applications").insert(insertPayload as any);
      return NextResponse.json({ redirect: result.url, visaWarning }, { status: 200 });
    }

    // Direct ATS submission succeeded — record as 'applied'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("applications").insert(insertPayload as any);

    return NextResponse.json(
      { success: true, submissionId: result.submissionId, visaWarning, extensionToken },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
