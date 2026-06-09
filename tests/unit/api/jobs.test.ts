import { GET } from "@/app/api/jobs/route";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server");

const MOCK_USER = { id: "user-abc" };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs");
}

/** Chainable mock for the jobs query. Tracks select/eq/not/order calls. */
function makeJobsQuery(resolvedJobs: unknown[] = []) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.not.mockReturnValue(q);
  q.order.mockResolvedValue({ data: resolvedJobs, error: null });
  return q;
}

/** Chainable mock for single-column lookups (applications / skipped_jobs). */
function makeSeenQuery(jobIds: string[] = []) {
  const q = { select: vi.fn(), eq: vi.fn() };
  q.select.mockReturnValue(q);
  q.eq.mockResolvedValue({
    data: jobIds.map((id) => ({ job_id: id })),
    error: null,
  });
  return q;
}

function setupClient({
  user = MOCK_USER as typeof MOCK_USER | null,
  appliedIds = [] as string[],
  skippedIds = [] as string[],
  jobs = [] as unknown[],
} = {}) {
  const jobsQuery = makeJobsQuery(jobs);
  const appsQuery = makeSeenQuery(appliedIds);
  const skippedQuery = makeSeenQuery(skippedIds);

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "applications") return appsQuery;
      if (table === "skipped_jobs") return skippedQuery;
      if (table === "jobs") return jobsQuery;
      throw new Error(`Unexpected table in mock: ${table}`);
    }),
  };

  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return { supabase, jobsQuery, appsQuery, skippedQuery };
}

describe("GET /api/jobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if no authenticated user", async () => {
    setupClient({ user: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("queries only active=true jobs", async () => {
    const { jobsQuery } = setupClient();
    await GET(makeRequest());
    expect(jobsQuery.eq).toHaveBeenCalledWith("active", true);
  });

  it("excludes seen job IDs at the DB level via .not()", async () => {
    const { jobsQuery } = setupClient({
      appliedIds: ["job-1"],
      skippedIds: ["job-2"],
    });
    await GET(makeRequest());
    expect(jobsQuery.not).toHaveBeenCalledWith("id", "in", "(job-1,job-2)");
  });

  it("orders results by created_at DESC", async () => {
    const { jobsQuery } = setupClient();
    await GET(makeRequest());
    expect(jobsQuery.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("selects explicit columns — no SELECT *", async () => {
    const { jobsQuery } = setupClient();
    await GET(makeRequest());
    expect(jobsQuery.select).not.toHaveBeenCalledWith("*");
    const selectArg = jobsQuery.select.mock.calls[0]?.[0] as string;
    for (const col of ["id", "company", "role", "ats_type", "ats_job_id", "tags", "created_at"]) {
      expect(selectArg).toContain(col);
    }
  });
});
