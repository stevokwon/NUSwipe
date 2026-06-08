import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationBoard } from "@/components/tracker/ApplicationBoard";
import type { ApplicationWithJob } from "@/lib/types";

export default async function TrackerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, user_id, job_id, status, ats_submission_id, notes, applied_at, updated_at, jobs(id, company, role, location, division, description, visa_sponsorship, salary_range, ats_type, ats_board_token, ats_job_id, ats_fallback_url, logo_url, tags, active, created_at)"
    )
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Application Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track your pipeline and update statuses as you hear back.
        </p>
      </div>

      <ApplicationBoard
        initialApplications={(applications ?? []) as ApplicationWithJob[]}
      />
    </div>
  );
}
