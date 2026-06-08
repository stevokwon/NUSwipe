import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import type { Profile, Job } from "@/lib/types";
import { isProfileComplete } from "@/lib/types";

export default async function SwipePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !isProfileComplete(profile as Profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
        <div className="text-6xl">👤</div>
        <h2 className="text-2xl font-bold text-white">Complete your profile first</h2>
        <p className="text-slate-400 max-w-xs text-sm">
          We need your resume and basic info before we can submit applications on your behalf.
        </p>
        <Link
          href="/profile"
          className="mt-2 inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          Complete Profile →
        </Link>
      </div>
    );
  }

  // Fetch unseen jobs server-side
  const [appliedRes, skippedRes] = await Promise.all([
    supabase.from("applications").select("job_id").eq("user_id", user.id),
    supabase.from("skipped_jobs").select("job_id").eq("user_id", user.id),
  ]);

  const seenIds = new Set<string>([
    ...((appliedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
    ...((skippedRes.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
  ]);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const unseenJobs = ((jobs ?? []) as Job[]).filter((j) => !seenIds.has(j.id));

  return (
    <div className="flex flex-col items-center pt-6 pb-16 px-4">
      <SwipeStack initialJobs={unseenJobs} />
    </div>
  );
}
