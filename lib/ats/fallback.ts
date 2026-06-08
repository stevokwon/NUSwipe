import type { Job } from "@/lib/types";

// Handles jobs whose ats_type is "url" — opens the company career page in a
// new tab.  The caller must record the application as "pending" (not "applied")
// because submission is unconfirmed until the user completes the external form.
export function submitToFallback(
  job: Pick<Job, "ats_fallback_url">
): { kind: "redirect"; url: string } {
  if (!job.ats_fallback_url) {
    throw new Error("No fallback URL configured for this job");
  }
  return { kind: "redirect", url: job.ats_fallback_url };
}
