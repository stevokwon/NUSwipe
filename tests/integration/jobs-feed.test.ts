/**
 * Integration test — GET /api/jobs feed pipeline
 *
 * What is REAL (not mocked):
 *   Route handler logic, seen-ID merging, error degradation, empty-state handling
 *
 * What is MOCKED:
 *   Supabase client → vi.mock (this route makes no external HTTP calls)
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

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Job } from "@/lib/types";

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Module-level vi.fn() references mutated per-test via setupFeed().
const mockGetUser = vi.fn();
const mockFrom    = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from:             mockFrom,
    })
  ),
}));

// ── Lazy import (after vi.mock is hoisted) ────────────────────────────────────
const { GET: jobsFeedGET } = await import("@/app/api/jobs/route");

// ── Fixtures ──────────────────────────────────────────────────────────────────

const jobA: Job = {
  id:               "job-a",
  company:          "Stripe",
  role:             "Software Engineer Intern",
  location:         "SG",
  division:         "Engineering",
  description:      "Build the payments infrastructure.",
  visa_sponsorship: true,
  salary_range:     "SGD 7,000 / month",
  ats_type:         "greenhouse",
  ats_board_token:  "stripe",
  ats_job_id:       "6142753",
  ats_fallback_url: null,
  logo_url:         null,
  tags:             ["SWE", "fintech"],
  active:           true,
  created_at:       "2026-01-02T00:00:00Z",
};

const jobB: Job = {
  id:               "job-b",
  company:          "Grab",
  role:             "Backend Engineer Intern",
  location:         "SG",
  division:         null,
  description:      null,
  visa_sponsorship: false,
  salary_range:     "SGD 3,200 / month",
  ats_type:         "url",
  ats_board_token:  null,
  ats_job_id:       null,
  ats_fallback_url: "https://grab.careers",
  logo_url:         null,
  tags:             [],
  active:           true,
  created_at:       "2026-01-01T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs");
}

/**
 * Configures the Supabase mock per test.
 *
 * feedJobs represents what the DB returns after applying all filters — the
 * mock does not re-implement .not() logic; callers pass the expected result set.
 * seenLookupError simulates a failed applications / skipped_jobs query.
 */
function setupFeed({
  user            = { id: "user-a" } as { id: string } | null,
  appliedIds      = [] as string[],
  skippedIds      = [] as string[],
  feedJobs        = [jobA, jobB] as Job[],
  seenLookupError = null as { message: string } | null,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user } });

  mockFrom.mockImplementation((table: string) => {
    if (table === "applications") {
      const q = { select: vi.fn(), eq: vi.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockResolvedValue({
        data:  seenLookupError ? null : appliedIds.map((id) => ({ job_id: id })),
        error: seenLookupError,
      });
      return q;
    }
    if (table === "skipped_jobs") {
      const q = { select: vi.fn(), eq: vi.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockResolvedValue({
        data:  seenLookupError ? null : skippedIds.map((id) => ({ job_id: id })),
        error: seenLookupError,
      });
      return q;
    }
    if (table === "jobs") {
      const q = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), order: vi.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.not.mockReturnValue(q);
      q.order.mockResolvedValue({ data: feedJobs, error: null });
      return q;
    }
    throw new Error(`Unexpected table in mock: ${table}`);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/jobs — jobs feed integration", () => {
  afterEach(() => vi.clearAllMocks());

  // ── 1. Happy path ───────────────────────────────────────────────────────────

  it("1 · authenticated user — 200 + jobs array with expected field shape", async () => {
    setupFeed();
    const res  = await jobsFeedGET(makeRequest());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(Array.isArray(body.jobs)).toBe(true);

    const jobs = body.jobs as Record<string, unknown>[];
    expect(jobs).toHaveLength(2);

    // Every job must carry the explicit columns from JOB_COLUMNS
    for (const job of jobs) {
      for (const col of [
        "id", "company", "role", "location",
        "visa_sponsorship", "ats_type", "tags", "created_at",
      ]) {
        expect(job).toHaveProperty(col);
      }
    }
  });

  // ── 2. Auth guard ───────────────────────────────────────────────────────────

  it("2 · unauthenticated — 401 and no DB queries made", async () => {
    setupFeed({ user: null });
    const res  = await jobsFeedGET(makeRequest());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");

    // Auth guard must fire before any DB call
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── 3. Graceful degradation ─────────────────────────────────────────────────

  it("3 · seenIds lookup error — degrades gracefully, returns full active feed", async () => {
    // When applications / skipped_jobs queries error, (data ?? []) yields [] so
    // seenIds is empty and the feed returns all active jobs — no 500.
    setupFeed({ seenLookupError: { message: "connection refused" } });

    const res  = await jobsFeedGET(makeRequest());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(Array.isArray(body.jobs)).toBe(true);
    expect((body.jobs as unknown[]).length).toBeGreaterThan(0);
    expect(body.error).toBeUndefined();
  });

  // ── 4. Empty state ──────────────────────────────────────────────────────────

  it("4 · no active jobs — returns { jobs: [] }, not null or undefined", async () => {
    setupFeed({ feedJobs: [] });

    const res  = await jobsFeedGET(makeRequest());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.jobs).toEqual([]);
  });
});
