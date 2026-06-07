import type { Profile, Job } from "@/lib/types";
import { submitToGreenhouse } from "./greenhouse";
import { submitToLever } from "./lever";

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
      const submissionId = await submitToLever(profile, job);
      return { kind: "submitted", submissionId };
    }
    case "url": {
      if (!job.ats_fallback_url) {
        throw new Error("No fallback URL configured for this job");
      }
      return { kind: "redirect", url: job.ats_fallback_url };
    }
    default:
      throw new Error(`Unknown ATS type: ${(job as Job).ats_type}`);
  }
}
