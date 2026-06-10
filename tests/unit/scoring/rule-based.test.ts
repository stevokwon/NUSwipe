import { describe, it, expect } from "vitest";
import { scoreJob } from "@/lib/scoring/rule-based";
import type { Profile, Job } from "@/lib/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    first_name: "Alice",
    last_name: "Tan",
    preferred_name: null,
    email: "alice@example.com",
    phone_country_code: null,
    phone_number: null,
    role: "candidate",
    sg_residency: null,
    ns_status: null,
    sg_university: null,
    hk_residency: null,
    hk_university: null,
    major: "Computer Science",
    minor: null,
    gpa: null,
    grad_month_year: null,
    resume_url: null,
    linkedin_url: null,
    skills: [],
    target_role: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    company: "Acme Corp",
    role: "Software Engineer",
    location: "Singapore",
    division: null,
    description: null,
    visa_sponsorship: false,
    salary_range: null,
    ats_type: "url",
    ats_board_token: null,
    ats_job_id: null,
    ats_fallback_url: null,
    logo_url: null,
    tags: [],
    active: true,
    posted_by: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("scoreJob", () => {
  it("full match — all 5 dimensions fire → score 100, all reason chips present", () => {
    const profile = makeProfile({
      skills: ["React", "TypeScript", "Node.js", "Python"],
      target_role: "Software Engineering",
      sg_university: "NUS",
      sg_residency: "citizen",
      grad_month_year: "06/2026", // recent grad
    });
    const job = makeJob({
      tags: ["React", "TypeScript", "Node.js", "Python", "internship"],
      division: "Software Engineering",
      location: "Singapore",
      visa_sponsorship: false, // citizen covers this
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(100);
    expect(result.reasons).toContain("Skills match");
    expect(result.reasons).toContain("Role match");
    expect(result.reasons).toContain("Local role");
    expect(result.reasons).toContain("Visa ok");
    expect(result.reasons).toContain("Internship");
  });

  it("zero overlap — empty skills, no target_role, foreign location, no visa, far grad → score 0, empty reasons", () => {
    const profile = makeProfile({
      skills: [],
      target_role: null,
      sg_university: null,
      hk_university: null,
      sg_residency: null,
      hk_residency: null,
      grad_month_year: "06/2018",
    });
    const job = makeJob({
      tags: ["Java", "Scala"],
      division: "Data Engineering",
      location: "New York",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("partial: skills only — only skills overlap → score ≤ 40, only 'Skills match' in reasons", () => {
    const profile = makeProfile({
      skills: ["React"],
      target_role: null,
      sg_university: null,
      hk_university: null,
      sg_residency: null,
      hk_residency: null,
      grad_month_year: "06/2018",
    });
    const job = makeJob({
      tags: ["React", "Vue"],
      location: "New York",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(10);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.reasons).toEqual(["Skills match"]);
  });

  it("skills cap — 5 matching skills → score capped at 40 (not 50)", () => {
    const profile = makeProfile({
      skills: ["React", "TypeScript", "Node.js", "Python", "Go"],
      target_role: null,
      sg_university: null,
      hk_university: null,
      sg_residency: null,
      hk_residency: null,
      grad_month_year: "06/2018",
    });
    const job = makeJob({
      tags: ["React", "TypeScript", "Node.js", "Python", "Go", "Rust"],
      location: "New York",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    // 5 matches × 10 = 50, but capped at 40
    expect(result.score).toBe(40);
    expect(result.reasons).toContain("Skills match");
  });

  it("location: HK — hk_university set, job.location = 'Hong Kong' → +20", () => {
    const profile = makeProfile({
      skills: [],
      target_role: null,
      sg_university: null,
      hk_university: "HKU",
      sg_residency: null,
      hk_residency: null,
      grad_month_year: "06/2018",
    });
    const job = makeJob({
      tags: [],
      location: "Hong Kong",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(20);
    expect(result.reasons).toContain("Local role");
  });

  it("visa: citizen bypasses sponsorship — sg_residency='citizen', visa_sponsorship=false → still +10", () => {
    const profile = makeProfile({
      skills: [],
      target_role: null,
      sg_university: null,
      hk_university: null,
      sg_residency: "citizen",
      hk_residency: null,
      grad_month_year: "06/2018",
    });
    const job = makeJob({
      tags: [],
      location: "New York",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(10);
    expect(result.reasons).toContain("Visa ok");
  });

  it("seniority: far grad year — grad_month_year='06/2020' (past, >2 yrs) → 0 seniority pts", () => {
    const profile = makeProfile({
      skills: [],
      target_role: null,
      sg_university: null,
      hk_university: null,
      sg_residency: null,
      hk_residency: null,
      grad_month_year: "06/2020",
    });
    const job = makeJob({
      tags: ["internship"],
      location: "New York",
      visa_sponsorship: false,
    });

    const result = scoreJob(profile, job);

    expect(result.score).toBe(0);
    expect(result.reasons).not.toContain("Internship");
  });

  it("null safety — skills=[], target_role=null, all nullable fields null → returns { score: 0, reasons: [] } without throwing", () => {
    const profile = makeProfile();
    const job = makeJob();

    expect(() => scoreJob(profile, job)).not.toThrow();

    const result = scoreJob(profile, job);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });
});
