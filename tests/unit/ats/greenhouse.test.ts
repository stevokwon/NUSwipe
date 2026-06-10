import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitToGreenhouse } from "@/lib/ats/greenhouse";
import { logger } from "@/lib/logger";
import type { Profile, Job } from "@/lib/types";

// ── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock logger for privacy assertions ──────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseProfile: Profile = {
  id: "user-1",
  first_name: "Jane",
  last_name: "Doe",
  preferred_name: null,
  email: "jane@example.com",
  phone_country_code: "+65",
  phone_number: "91234567",
  role: "candidate",
  sg_residency: null,
  ns_status: null,
  sg_university: null,
  hk_residency: null,
  hk_university: null,
  major: "Computer Science",
  minor: null,
  gpa: "4.50",
  grad_month_year: "May 2026",
  resume_url: "https://storage.example.com/resume.pdf",
  linkedin_url: null,
  skills: [],
  target_role: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const baseJob: Job = {
  id: "job-1",
  company: "Acme Corp",
  role: "Software Engineer",
  location: "SG",
  division: null,
  description: null,
  visa_sponsorship: true,
  salary_range: null,
  ats_type: "greenhouse",
  ats_board_token: "acme-corp",
  ats_job_id: "12345",
  ats_fallback_url: null,
  logo_url: null,
  tags: [],
  active: true,
  created_at: "2025-01-01T00:00:00Z",
};

function mockSuccessResponse(id = 99001): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id }),
  });
}

function mockErrorResponse(status = 422, body = "Unprocessable"): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("submitToGreenhouse", () => {
  // ── Happy path ──────────────────────────────────────────────────────────

  it("calls the correct Greenhouse API URL", async () => {
    mockSuccessResponse();
    await submitToGreenhouse(baseProfile, baseJob);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://boards-api.greenhouse.io/v1/boards/acme-corp/jobs/12345/applications"
    );
  });

  it("returns the Greenhouse application ID as a string on success", async () => {
    mockSuccessResponse(99001);
    const id = await submitToGreenhouse(baseProfile, baseJob);
    expect(id).toBe("99001");
  });

  it("includes APAC question answers in payload when profile has SG residency", async () => {
    mockSuccessResponse();
    const profile: Profile = {
      ...baseProfile,
      sg_residency: "Citizen",
      ns_status: "Completed",
      sg_university: "NUS",
    };
    await submitToGreenhouse(profile, baseJob);

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body).toHaveProperty("answers");
    const questions = (body.answers as Array<{ question: string; answer: string }>)
      .map((a) => a.question);
    expect(questions).toContain("Singapore Residency Status");
    expect(questions).toContain("National Service Status");
    expect(questions).toContain("University");
  });

  it("includes education block when profile has a major", async () => {
    mockSuccessResponse();
    await submitToGreenhouse(baseProfile, baseJob);

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body).toHaveProperty("education");
    const edu = body.education[0];
    expect(edu.major).toBe("Computer Science");
    expect(edu.end_date).toBe("May 2026");
    expect(edu.gpa).toBe("4.50");
  });

  it("omits answers field when all APAC fields are null or Not Applicable", async () => {
    mockSuccessResponse();
    // All APAC fields null — mapper returns empty questionAnswers
    await submitToGreenhouse(baseProfile, baseJob);

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    // answers should be absent or empty
    if ("answers" in body) {
      expect((body.answers as unknown[]).length).toBe(0);
    }
  });

  it("includes linkedin social_media_url when present", async () => {
    mockSuccessResponse();
    const profile: Profile = {
      ...baseProfile,
      linkedin_url: "https://linkedin.com/in/janedoe",
    };
    await submitToGreenhouse(profile, baseJob);

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body.social_media_urls).toEqual([
      { type: "linkedin", value: "https://linkedin.com/in/janedoe" },
    ]);
  });

  // ── Error paths ─────────────────────────────────────────────────────────

  it("throws when ats_board_token is missing", async () => {
    const job: Job = { ...baseJob, ats_board_token: null };
    await expect(submitToGreenhouse(baseProfile, job)).rejects.toThrow(
      "Missing Greenhouse board token or job ID"
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws when ats_job_id is missing", async () => {
    const job: Job = { ...baseJob, ats_job_id: null };
    await expect(submitToGreenhouse(baseProfile, job)).rejects.toThrow(
      "Missing Greenhouse board token or job ID"
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws when resume_url is missing", async () => {
    const profile: Profile = { ...baseProfile, resume_url: null };
    await expect(submitToGreenhouse(profile, baseJob)).rejects.toThrow(
      "No resume on file"
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws with status code when Greenhouse API returns an error", async () => {
    mockErrorResponse(422, "Invalid application");
    await expect(submitToGreenhouse(baseProfile, baseJob)).rejects.toThrow(
      "Greenhouse submission failed (422)"
    );
  });

  // ── Privacy ─────────────────────────────────────────────────────────────

  it("PRIVACY — never logs sensitive APAC field values at any log level", async () => {
    mockSuccessResponse();
    const profile: Profile = {
      ...baseProfile,
      sg_residency: "Citizen",
      ns_status: "Completed",
      hk_residency: "IANG Visa Holder",
    };

    await submitToGreenhouse(profile, baseJob);

    const sensitiveValues = ["Citizen", "Completed", "IANG Visa Holder"];
    const allCalls = [
      ...(vi.mocked(logger.warn).mock.calls),
      ...(vi.mocked(logger.info).mock.calls),
      ...(vi.mocked(logger.error).mock.calls),
    ];

    for (const [meta] of allCalls as Array<[Record<string, unknown>, string]>) {
      const metaJson = JSON.stringify(meta);
      for (const v of sensitiveValues) {
        expect(metaJson).not.toContain(v);
      }
    }
  });
});
