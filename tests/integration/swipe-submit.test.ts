/**
 * Integration test — swipe-to-submit pipeline
 *
 * What is REAL (not mocked):
 *   applyToJob router, submitToGreenhouse, submitToFallback,
 *   checkVisaCompatibility, buildApacPayload, route handlers
 *
 * What is MOCKED:
 *   Supabase client   → vi.mock (no real DB needed)
 *   External HTTP     → MSW intercepts fetch to Greenhouse / Lever APIs
 *
 * Run via: pnpm test:int  (sets SUPABASE_ENV=local automatically)
 */

// ── Guard — must be checked before any imports execute ───────────────────────
if (process.env.SUPABASE_ENV !== "local") {
  throw new Error(
    "[integration] SUPABASE_ENV must be 'local'.\n" +
      "Run integration tests via: pnpm test:int\n" +
      "The vitest.integration.config.ts sets this automatically."
  );
}

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Profile, Job } from "@/lib/types";

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Module-level vi.fn() references mutated per-test via setupSupabase().
const mockGetUser = vi.fn();
const mockFrom    = vi.fn();
const mockInsert  = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from:              mockFrom,
    })
  ),
}));

// ── Lazy imports (after vi.mock is hoisted) ───────────────────────────────────
const { POST: applyPOST }       = await import("@/app/api/apply/route");
const { GET:  applicationsGET } = await import("@/app/api/applications/route");

// ── MSW — intercept Greenhouse and Lever HTTP ─────────────────────────────────
let capturedGreenhouseBody: unknown = null;
let greenhouseCallCount             = 0;

const server = setupServer(
  http.post(
    "https://boards-api.greenhouse.io/v1/boards/:token/jobs/:jobId/applications",
    async ({ request }) => {
      capturedGreenhouseBody = await request.json();
      greenhouseCallCount++;
      return HttpResponse.json({ id: 99001 });
    }
  ),
  http.post(
    "https://jobs.lever.co/:company/apply/:postingId",
    () => HttpResponse.text("lever-submitted")
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

afterEach(() => {
  server.resetHandlers();
  capturedGreenhouseBody = null;
  greenhouseCallCount    = 0;
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseProfile: Profile = {
  id:                "user-a",
  first_name:        "Jane",
  last_name:         "Doe",
  preferred_name:    null,
  email:             "jane@example.com",
  phone_country_code: "+65",
  phone_number:      "91234567",
  sg_residency:      "Citizen",
  ns_status:         "Completed",
  sg_university:     "NUS",
  hk_residency:      null,
  hk_university:     null,
  major:             "Computer Science",
  minor:             null,
  gpa:               "4.50",
  grad_month_year:   "May 2026",
  resume_url:        "https://storage.supabase.co/public/resumes/resume.pdf",
  linkedin_url:      null,
  created_at:        "2025-01-01T00:00:00Z",
  updated_at:        "2025-01-01T00:00:00Z",
};

const greenhouseJob: Job = {
  id:               "job-gh-1",
  company:          "Acme Corp",
  role:             "Software Engineer",
  location:         "SG",
  division:         null,
  description:      null,
  visa_sponsorship: true,
  salary_range:     null,
  ats_type:         "greenhouse",
  ats_board_token:  "acme-corp",
  ats_job_id:       "12345",
  ats_fallback_url: null,
  logo_url:         null,
  tags:             [],
  active:           true,
  created_at:       "2025-01-01T00:00:00Z",
};

const urlJob: Job = {
  ...greenhouseJob,
  id:               "job-url-1",
  ats_type:         "url",
  ats_board_token:  null,
  ats_job_id:       null,
  ats_fallback_url: "https://careers.acme.com/apply",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApplyRequest(jobId: string): Parameters<typeof applyPOST>[0] {
  return new Request("http://localhost/api/apply", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jobId }),
  }) as unknown as Parameters<typeof applyPOST>[0];
}

/**
 * Configures mockGetUser and mockFrom per test.
 *
 * The chain returned by mockFrom is made "thenable" so that GET /applications
 * (which awaits the chain directly without .single()) resolves correctly.
 */
function setupSupabase(opts: {
  userId?:          string;
  profile?:         Profile;
  job?:             Job;
  existingApp?:     unknown;
  applicationsRows?: unknown[];
} = {}) {
  const {
    userId          = "user-a",
    profile         = baseProfile,
    job             = greenhouseJob,
    existingApp     = null,
    applicationsRows = [],
  } = opts;

  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });

  mockFrom.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      order:       vi.fn().mockReturnThis(),
      single:      vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingApp }),
      insert:      mockInsert,
    };

    // Make the chain a thenable so `await from(...).select(...).eq(...).order(...)`
    // resolves correctly (used by GET /api/applications — no .single() terminal).
    chain.then = (
      resolve: (v: { data: unknown; error: null }) => void,
      reject:  (e: unknown) => void
    ) => Promise.resolve({ data: applicationsRows, error: null }).then(resolve, reject);

    if (table === "candidates") {
      (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: profile,
        error: null,
      });
    } else if (table === "jobs") {
      (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: job,
        error: null,
      });
    }

    return chain;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("swipe-to-submit integration pipeline", () => {
  // ── 1. Direct Greenhouse submission ────────────────────────────────────────

  it("1 · direct submission — APAC payload built, Greenhouse called, tracker row 'applied'", async () => {
    setupSupabase(); // Citizen profile + Greenhouse job + visa_sponsorship=true

    const res  = await applyPOST(makeApplyRequest("job-gh-1"));
    const body = await res.json() as Record<string, unknown>;

    // Route returns 200 success
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // MSW: Greenhouse API was called exactly once
    expect(greenhouseCallCount).toBe(1);

    // buildApacPayload ran — questionAnswers carries SG residency entry
    const payload  = capturedGreenhouseBody as Record<string, unknown>;
    const answers  = payload.answers as Array<{ question: string; answer: string }>;
    expect(Array.isArray(answers)).toBe(true);

    const sgEntry = answers.find(a => a.question === "Singapore Residency Status");
    expect(sgEntry).toBeDefined();
    expect(sgEntry?.answer).toBe("Citizen");

    // NS Status also present
    const nsEntry = answers.find(a => a.question === "National Service Status");
    expect(nsEntry?.answer).toBe("Completed");

    // Education block built from profile.major / gpa / grad_month_year
    const education = payload.education as Array<Record<string, unknown>>;
    expect(Array.isArray(education)).toBe(true);
    expect(education[0].major).toBe("Computer Science");

    // Supabase insert carries status "applied" for confirmed ATS submission
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "applied" })
    );
  });

  // ── 2. URL fallback ────────────────────────────────────────────────────────

  it("2 · URL fallback — redirect returned, tracker row 'pending', Greenhouse never called", async () => {
    setupSupabase({ job: urlJob });

    const res  = await applyPOST(makeApplyRequest("job-url-1"));
    const body = await res.json() as Record<string, unknown>;

    // Redirect response shape
    expect(res.status).toBe(200);
    expect(body.redirect).toBe("https://careers.acme.com/apply");

    // No Greenhouse HTTP call
    expect(greenhouseCallCount).toBe(0);

    // Tracker row is pending — submission unconfirmed until user completes form
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });

  // ── 3. Incompatible residency ──────────────────────────────────────────────

  it("3 · incompatible residency — 422 with reason, zero inserts, ATS never called", async () => {
    const blockedProfile: Profile = {
      ...baseProfile,
      sg_residency: "Employment Pass Required",
    };
    const noSponsorJob: Job = { ...greenhouseJob, visa_sponsorship: false };

    setupSupabase({ profile: blockedProfile, job: noSponsorJob });

    const res  = await applyPOST(makeApplyRequest("job-gh-1"));
    const body = await res.json() as Record<string, unknown>;

    // checkVisaCompatibility fired the gate
    expect(res.status).toBe(422);
    expect(typeof body.error).toBe("string");
    expect(body.field).toBe("sg_residency");

    // Privacy: response body must NOT contain the raw field value
    expect(JSON.stringify(body)).not.toContain("Employment Pass Required");

    // Greenhouse never reached
    expect(greenhouseCallCount).toBe(0);

    // No tracker insert — blocked before ATS submission
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // ── 4. RLS negative — user B cannot read user A's rows ────────────────────

  it("4 · RLS negative — user B's query returns empty array, no error", async () => {
    // Supabase RLS silently filters user A's rows from user B's query.
    // The mock simulates this: applicationsRows=[] for user B's auth context.
    setupSupabase({ userId: "user-b", applicationsRows: [] });

    const res  = await applicationsGET();
    const body = await res.json() as Record<string, unknown>;

    // Route handles empty RLS result gracefully
    expect(res.status).toBe(200);
    expect(body.applications).toEqual([]);

    // No error propagated — zero rows is not a failure
    expect(body.error).toBeUndefined();
  });
});
