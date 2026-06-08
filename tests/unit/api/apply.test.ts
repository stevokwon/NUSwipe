import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile, Job } from "@/lib/types";
import { applyToJob } from "@/lib/ats";

// ── Mock Supabase ─────────────────────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

// ── Mock ATS router ───────────────────────────────────────────────────────────
vi.mock("@/lib/ats", () => ({
  applyToJob: vi.fn().mockResolvedValue({ kind: "submitted", submissionId: "gh-001" }),
}));

// ── Mock legal checker ────────────────────────────────────────────────────────
vi.mock("@/lib/profile", () => ({
  checkVisaCompatibility: vi.fn().mockReturnValue({ compatible: true }),
  buildApacPayload: vi.fn().mockReturnValue({ questionAnswers: [], educationAnswers: { major: "", gradDate: "", gpa: null } }),
}));

// ── Lazy import (after mocks) ─────────────────────────────────────────────────
const { POST } = await import("@/app/api/apply/route");
import { checkVisaCompatibility } from "@/lib/profile";

// ── Shared insert spy — captured across all from("applications") calls ────────
const mockInsert = vi.fn().mockResolvedValue({ error: null });

// ── Fixtures ──────────────────────────────────────────────────────────────────
const completeProfile: Profile = {
  id: "user-1",
  first_name: "Jane",
  last_name: "Doe",
  preferred_name: null,
  email: "jane@example.com",
  phone_country_code: "+65",
  phone_number: "91234567",
  sg_residency: "Citizen",
  ns_status: "Completed",
  sg_university: "NUS",
  hk_residency: null,
  hk_university: null,
  major: "Computer Science",
  minor: null,
  gpa: "4.50",
  grad_month_year: "May 2026",
  resume_url: "https://storage.example.com/resume.pdf",
  linkedin_url: null,
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
  visa_sponsorship: false,
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

function makeRequest(body: Record<string, unknown> = { jobId: "job-1" }) {
  return new Request("http://localhost/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

/** Wire up standard Supabase chain for a successful path */
function setupSuccessPath(
  profileOverrides: Partial<Profile> = {},
  jobOverrides: Partial<Job> = {}
) {
  const profile = { ...completeProfile, ...profileOverrides };
  const job = { ...baseJob, ...jobOverrides };

  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

  mockFrom.mockImplementation((table: string) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: mockInsert,
    };

    if (table === "profiles") {
      chain.single.mockResolvedValue({ data: profile, error: null });
    } else if (table === "jobs") {
      chain.single.mockResolvedValue({ data: job, error: null });
    } else if (table === "applications") {
      // First call: duplicate check (maybeSingle → no existing)
      chain.maybeSingle.mockResolvedValue({ data: null });
    }

    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  // Reset legal checker to compatible by default
  vi.mocked(checkVisaCompatibility).mockReturnValue({ compatible: true });
  // Reset ATS router to direct-submit default
  vi.mocked(applyToJob).mockResolvedValue({ kind: "submitted", submissionId: "gh-001" });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/apply — legal gate (A4)", () => {
  it("returns 422 with reason and field when SG profile is incompatible", async () => {
    setupSuccessPath(
      { sg_residency: "Employment Pass Required" },
      { visa_sponsorship: false }
    );

    vi.mocked(checkVisaCompatibility).mockReturnValue({
      compatible: false,
      reason: "This role does not offer visa sponsorship. Your current residency status requires Employment Pass sponsorship.",
      field: "sg_residency",
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.field).toBe("sg_residency");
    expect(body.error).toBeTruthy();
    // Privacy: response must NOT expose the actual field value
    expect(JSON.stringify(body)).not.toContain("Employment Pass Required");
  });

  it("returns 422 with field when HK profile is incompatible", async () => {
    setupSuccessPath(
      { hk_residency: "Visa Required", sg_residency: null },
      { visa_sponsorship: false }
    );

    vi.mocked(checkVisaCompatibility).mockReturnValue({
      compatible: false,
      reason: "This role does not offer visa sponsorship. Your current residency status requires visa sponsorship.",
      field: "hk_residency",
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.field).toBe("hk_residency");
    expect(body.error).toBeTruthy();
  });

  it("proceeds to ATS submission when profile is compatible", async () => {
    setupSuccessPath(
      { sg_residency: "Citizen" },
      { visa_sponsorship: true }
    );

    vi.mocked(checkVisaCompatibility).mockReturnValue({ compatible: true });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // ATS was called — response has submissionId
    const body = await res.json();
    expect(body.success).toBe(true);
    // Direct ATS submission must record status "applied" — not "pending"
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "applied" })
    );
  });

  it("redirect result → insert records status 'pending' (unconfirmed submission)", async () => {
    setupSuccessPath({}, { visa_sponsorship: true, ats_type: "url", ats_fallback_url: "https://careers.acme.com" });

    vi.mocked(applyToJob).mockResolvedValue({ kind: "redirect", url: "https://careers.acme.com" });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.redirect).toBe("https://careers.acme.com");
    // URL-fallback must record status "pending" — submission unconfirmed
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });

  it("treats null residency as compatible and continues to ATS", async () => {
    setupSuccessPath(
      { sg_residency: null, hk_residency: null },
      { visa_sponsorship: false }
    );

    vi.mocked(checkVisaCompatibility).mockReturnValue({ compatible: true });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
  });
});
