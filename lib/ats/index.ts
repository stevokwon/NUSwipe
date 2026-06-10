import type { Profile, Job } from "@/lib/types";
import { submitToGreenhouse } from "./greenhouse";
import { submitToLever } from "./lever";
import { submitToFallback } from "./fallback";

export type ApplyResult =
  | { kind: "submitted"; submissionId: string }
  | { kind: "redirect"; url: string };

// Routes the application to the correct ATS handler based on job.ats_type.
// Returns a discriminated union so the caller can handle each case.
export async function applyToJob(
  profile: Profile,
  job: Job
): Promise<ApplyResult> {
  switch (job.ats_type) {
    case "greenhouse": {
      const submissionId = await submitToGreenhouse(profile, job);
      return { kind: "submitted", submissionId };
    }
    case "lever": {
      try {
        const submissionId = await submitToLever(profile, job);
        return { kind: "submitted", submissionId };
      } catch {
        // Lever's direct apply endpoint is Cloudflare-protected and often rejects
        // server-side POSTs. Fall back to the hosted URL so the candidate can
        // complete the application manually.
        if (job.ats_fallback_url) {
          return { kind: "redirect", url: job.ats_fallback_url };
        }
        throw new Error("Lever submission failed and no fallback URL is available.");
      }
    }
    case "url":
      return submitToFallback(job);
    default:
      throw new Error(`Unknown ATS type: ${(job as Job).ats_type}`);
  }
}
