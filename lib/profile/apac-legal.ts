import type { Profile, Job } from '../types';
import { logger } from '../logger';

export type CompatibilityResult =
  | { compatible: true }
  | { compatible: false; reason: string; field: string };

// Residency values that require employer-sponsored work authorisation.
// Values MUST match the Select option values stored by ProfileForm.tsx.
// Exhaustive — adding a new value requires updating all ATS mappers and tests (AGENTS.md §9).
const SG_SPONSORSHIP_REQUIRED = new Set<string>([
  "Employment Pass Required", // ProfileForm value → employer must apply for EP
]);

const HK_SPONSORSHIP_REQUIRED = new Set<string>([
  "Visa Required", // ProfileForm value → general employment visa sponsorship needed
]);

/**
 * Determines whether a candidate's APAC residency status is compatible with
 * a job's visa sponsorship policy.
 *
 * Rules (from agent-context/current-sprint.md brainstorming decisions):
 * - visa_sponsorship true → always compatible (early return)
 * - SG EP/visa-required residency + no sponsorship → incompatible
 * - HK visa-required residency + no sponsorship → incompatible
 * - ns_status → never blocks; included in ATS payload only
 * - null residency → benefit of doubt → compatible
 *
 * Privacy: logs the field *name* on incompatibility, never the field *value*.
 */
export function checkVisaCompatibility(
  profile: Pick<Profile, 'sg_residency' | 'hk_residency' | 'ns_status'>,
  job: Pick<Job, 'visa_sponsorship'>,
): CompatibilityResult {
  if (job.visa_sponsorship) {
    return { compatible: true };
  }

  if (profile.sg_residency !== null && SG_SPONSORSHIP_REQUIRED.has(profile.sg_residency)) {
    logger.warn(
      { field: 'sg_residency' },
      'Visa incompatibility: SG residency requires sponsorship — proceeding with warning',
    );
    return {
      compatible: false,
      reason: "This role does not offer visa sponsorship and your SG residency status requires it.",
      field: "sg_residency",
    };
  }

  if (profile.hk_residency !== null && HK_SPONSORSHIP_REQUIRED.has(profile.hk_residency)) {
    logger.warn(
      { field: 'hk_residency' },
      'Visa incompatibility: HK residency requires sponsorship — proceeding with warning',
    );
    return {
      compatible: false,
      reason: "This role does not offer visa sponsorship and your HK residency status requires it.",
      field: "hk_residency",
    };
  }

  // ns_status intentionally not checked — NS field is payload-only, never a gate.
  // null residency → benefit of doubt → allow submission.
  return { compatible: true };
}
