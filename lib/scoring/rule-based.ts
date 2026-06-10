import type { Profile, Job } from "@/lib/types";

export interface ScoreResult {
  score: number;
  reasons: string[];
}

// ---------- helpers ----------

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

function safeSkills(profile: Profile): string[] {
  return Array.isArray(profile.skills) ? profile.skills : [];
}

// ---------- dimension scorers ----------

function scoreSkills(profile: Profile, job: Job): { pts: number; reasons: string[] } {
  const profileSkills = safeSkills(profile).map(normalise);
  const jobTags = job.tags.map(normalise);

  const matchCount = profileSkills.filter((s) => jobTags.includes(s)).length;
  const pts = Math.min(matchCount * 10, 40);
  const reasons: string[] = matchCount > 0 ? ["Skills match"] : [];
  return { pts, reasons };
}

function scoreRole(profile: Profile, job: Job): { pts: number; reasons: string[] } {
  if (!profile.target_role || !job.division) return { pts: 0, reasons: [] };

  const targetNorm = normalise(profile.target_role);
  const divisionNorm = normalise(job.division);

  const matches = targetNorm.includes(divisionNorm) || divisionNorm.includes(targetNorm);
  return matches ? { pts: 20, reasons: ["Role match"] } : { pts: 0, reasons: [] };
}

function scoreLocation(profile: Profile, job: Job): { pts: number; reasons: string[] } {
  const jobLocNorm = normalise(job.location);

  if (profile.sg_university) {
    const matches = jobLocNorm.includes("sg") || jobLocNorm.includes("singapore");
    return matches ? { pts: 20, reasons: ["Local role"] } : { pts: 0, reasons: [] };
  }

  if (profile.hk_university) {
    const matches = jobLocNorm.includes("hk") || jobLocNorm.includes("hong kong");
    return matches ? { pts: 20, reasons: ["Local role"] } : { pts: 0, reasons: [] };
  }

  return { pts: 0, reasons: [] };
}

function scoreVisa(profile: Profile, job: Job): { pts: number; reasons: string[] } {
  if (job.visa_sponsorship) return { pts: 10, reasons: ["Visa ok"] };

  // Match the values ProfileForm stores (PascalCase display labels)
  const sgOk =
    profile.sg_residency === "Citizen" || profile.sg_residency === "Permanent Resident";
  const hkOk =
    profile.hk_residency === "Permanent Resident";

  if (sgOk || hkOk) return { pts: 10, reasons: ["Visa ok"] };
  return { pts: 0, reasons: [] };
}

/**
 * Returns true if the profile's graduation date is within 2 years of today.
 * Accepts "Month YYYY" format (e.g. "May 2026") — what ProfileForm stores.
 * Falls back to "MM/YYYY" format for backward compatibility.
 */
function isRecentGrad(gradMonthYear: string | null): boolean {
  if (!gradMonthYear) return false;

  const trimmed = gradMonthYear.trim();
  let gradDate: Date | null = null;

  // Primary: "Month YYYY" (e.g. "May 2026") — what the ProfileForm placeholder shows
  const textParsed = new Date(`1 ${trimmed}`);
  if (!isNaN(textParsed.getTime())) {
    gradDate = textParsed;
  } else {
    // Fallback: "MM/YYYY"
    const parts = trimmed.split("/");
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      const year = parseInt(parts[1], 10);
      if (!isNaN(month) && !isNaN(year)) {
        gradDate = new Date(year, month - 1, 1);
      }
    }
  }

  if (!gradDate) return false;

  const today = new Date();
  const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  return gradDate >= twoYearsAgo;
}

function scoreSeniority(profile: Profile, job: Job): { pts: number; reasons: string[] } {
  const hasInternshipTag = job.tags.some((t) => normalise(t) === "internship");
  if (!hasInternshipTag) return { pts: 0, reasons: [] };

  if (isRecentGrad(profile.grad_month_year)) {
    return { pts: 10, reasons: ["Internship"] };
  }
  return { pts: 0, reasons: [] };
}

// ---------- main export ----------

export function scoreJob(profile: Profile, job: Job): ScoreResult {
  const dimensions = [
    scoreSkills(profile, job),
    scoreRole(profile, job),
    scoreLocation(profile, job),
    scoreVisa(profile, job),
    scoreSeniority(profile, job),
  ];

  let total = 0;
  const reasons: string[] = [];

  for (const dim of dimensions) {
    total += dim.pts;
    reasons.push(...dim.reasons);
  }

  return { score: Math.min(100, total), reasons };
}
