import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Profile, Job } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";
import { scoreJob } from "@/lib/scoring/rule-based";
import type { ScoreResult } from "@/lib/scoring/rule-based";

type ScoreMap = Record<string, ScoreResult>;

export default async function SkippedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check profile completeness
  const { data: profile } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !isProfileComplete(profile as Profile)) {
    redirect("/profile");
  }

  // Fetch skipped jobs
  const { data: skippedData } = await supabase
    .from("skipped_jobs")
    .select("job_id")
    .eq("user_id", user.id);

  const skippedIds = new Set<string>(
    ((skippedData ?? []) as { job_id: string }[]).map((r) => r.job_id)
  );

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const skippedJobs = ((jobs ?? []) as Job[]).filter((j) => skippedIds.has(j.id));

  const scores: ScoreMap = {};
  if (profile) {
    for (const job of skippedJobs) {
      scores[job.id] = scoreJob(profile as Profile, job);
    }
  }

  return (
    <div className="flex flex-col items-center pt-6 pb-16 px-4">
      <h1 className="text-2xl font-bold text-white mb-6">Skipped Jobs</h1>
      <SwipeStack 
        initialJobs={skippedJobs} 
        scores={scores} 
        isCircular={true} 
        emptyMessage="No skipped jobs"
        emptyLink={{ href: "/swipe", text: "Go to Jobs" }}
      />
    </div>
  );
}
