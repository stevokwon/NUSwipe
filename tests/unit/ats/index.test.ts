import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile, Job } from "@/lib/types";

// ── Mock the three ATS handlers ───────────────────────────────────────────────
vi.mock("@/lib/ats/greenhouse", () => ({
  submitToGreenhouse: vi.fn().mockResolvedValue("gh-001"),
}));

vi.mock("@/lib/ats/lever", () => ({
  submitToLever: vi.fn().mockResolvedValue("lv-abc"),
}));

vi.mock("@/lib/ats/fallback", () => ({
  submitToFallback: vi.fn().mockReturnValue({ kind: "redirect", url: "https://careers.acme.com/apply/99" }),
}));

import { applyToJob } from "@/lib/ats";
import { submitToGreenhouse } from "@/lib/ats/greenhouse";
import { submitToLever } from "@/lib/ats/lever";
import { submitToFallback } from "@/lib/ats/fallback";

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const profile = {} as Profile; // handlers are mocked — profile content irrelevant

const baseJob: Omit<Job, "ats_type"> = {
  id: "job-1",
  company: "Acme Corp",
  role: "SWE",
  location: "SG",
  division: null,
  description: null,
  visa_sponsorship: true,
  salary_range: null,
  ats_board_token: "acme",
  ats_job_id: "12345",
  ats_fallback_url: "https://careers.acme.com/apply/99",
  logo_url: null,
  tags: [],
  active: true,
  created_at: "2025-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("applyToJob — router dispatch", () => {
  it("greenhouse → delegates to submitToGreenhouse and returns submitted result", async () => {
    const job: Job = { ...baseJob, ats_type: "greenhouse" };
    const result = await applyToJob(profile, job);

    expect(submitToGreenhouse).toHaveBeenCalledOnce();
    expect(submitToGreenhouse).toHaveBeenCalledWith(profile, job);
    expect(result).toEqual({ kind: "submitted", submissionId: "gh-001" });
  });

  it("lever → delegates to submitToLever and returns submitted result", async () => {
    const job: Job = { ...baseJob, ats_type: "lever" };
    const result = await applyToJob(profile, job);

    expect(submitToLever).toHaveBeenCalledOnce();
    expect(submitToLever).toHaveBeenCalledWith(profile, job);
    expect(result).toEqual({ kind: "submitted", submissionId: "lv-abc" });
  });

  it("url → delegates to submitToFallback and returns redirect result", async () => {
    const job: Job = { ...baseJob, ats_type: "url" };
    const result = await applyToJob(profile, job);

    expect(submitToFallback).toHaveBeenCalledOnce();
    expect(submitToFallback).toHaveBeenCalledWith(job);
    expect(result).toEqual({ kind: "redirect", url: "https://careers.acme.com/apply/99" });
  });

  it("unknown ats_type → throws with descriptive error", async () => {
    const job: Job = { ...baseJob, ats_type: "unknown" as Job["ats_type"] };

    await expect(applyToJob(profile, job)).rejects.toThrow("Unknown ATS type: unknown");
    expect(submitToGreenhouse).not.toHaveBeenCalled();
    expect(submitToLever).not.toHaveBeenCalled();
    expect(submitToFallback).not.toHaveBeenCalled();
  });
});
