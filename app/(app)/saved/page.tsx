import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Profile, Job } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";
import { scoreJob } from "@/lib/scoring/rule-based";
import type { ScoreResult } from "@/lib/scoring/rule-based";

type SavedJobRow = {
  user_id: string;
  job_id: string;
  saved_at: string;
  jobs: Job;
};

type ScoreMap = Record<string, ScoreResult>;

export default async function SavedJobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !isProfileComplete(profile as Profile)) {
    redirect("/profile");
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("user_id, job_id, saved_at, jobs(*)")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const savedJobs = (data ?? []) as SavedJobRow[];
  const jobs = savedJobs.map((row) => row.jobs);
  const scores: ScoreMap = {};

  for (const saved of savedJobs) {
    scores[saved.job_id] = scoreJob(profile as Profile, saved.jobs);
  }

  return (
    <div className="flex flex-col items-center pt-6 pb-16 px-4">
      <h1 className="text-2xl font-bold text-white mb-6">Saved Jobs</h1>
      <SwipeStack
        initialJobs={jobs}
        scores={scores}
        savedJobsMode
        isCircular={true}
        emptyMessage="No saved jobs"
        emptyLink={{ href: "/swipe", text: "Go to Jobs" }}
      />
    </div>
  );
}
