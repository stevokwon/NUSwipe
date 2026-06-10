import type { Profile, Job } from "@/lib/types";

export interface ScoreResult {
  score: number;    // 0-100
  reasons: string[];
}

export function scoreJob(profile: Profile, job: Job): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Skills overlap — intersection of profile.skills and job.tags, 10pts each, max 40pts
  const profileSkills: string[] = (profile as Profile & { skills?: string[] }).skills ?? [];
  const jobTagsLower = job.tags.map((t) => t.toLowerCase());
  const matchingSkills = profileSkills.filter((s) =>
    jobTagsLower.includes(s.toLowerCase())
  );
  if (matchingSkills.length > 0) {
    score += Math.min(40, matchingSkills.length * 10);
    reasons.push("Skills match");
  }

  // Role match — profile.target_role substring-matches job.division (lowercase)
  const targetRole: string | undefined = (profile as Profile & { target_role?: string }).target_role ?? undefined;
  if (
    targetRole &&
    job.division &&
    job.division.toLowerCase().includes(targetRole.toLowerCase())
  ) {
    score += 20;
    reasons.push("Role match");
  }

  // Location — sg_university → +20 if location contains "sg" or "singapore"
  //            hk_university → +20 if location contains "hk" or "hong kong"
  const locationLower = job.location.toLowerCase();
  if (profile.sg_university) {
    if (locationLower.includes("sg") || locationLower.includes("singapore")) {
      score += 20;
      reasons.push("Local role");
    }
  } else if (profile.hk_university) {
    if (locationLower.includes("hk") || locationLower.includes("hong kong")) {
      score += 20;
      reasons.push("Local role");
    }
  }

  // Visa — job.visa_sponsorship OR profile is SG citizen/PR OR HK citizen/PR
  const sgOk =
    profile.sg_residency === "citizen" || profile.sg_residency === "pr";
  const hkOk =
    profile.hk_residency === "citizen" || profile.hk_residency === "pr";
  if (job.visa_sponsorship || sgOk || hkOk) {
    score += 10;
    reasons.push("Visa ok");
  }

  // Seniority — job tagged "internship" AND grad year within 2 years of today
  const isInternship = job.tags.map((t) => t.toLowerCase()).includes("internship");
  if (isInternship && profile.grad_month_year) {
    const gradYear = parseInt(profile.grad_month_year.slice(-4), 10);
    const currentYear = new Date().getFullYear();
    if (!isNaN(gradYear) && Math.abs(gradYear - currentYear) <= 2) {
      score += 10;
      reasons.push("Internship");
    }
  }

  return { score: Math.min(100, score), reasons };
}
