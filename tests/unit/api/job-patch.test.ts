import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateClient, mockCreateServiceRoleClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
  createServiceRoleClient: mockCreateServiceRoleClient,
}));

const { PATCH } = await import("@/app/api/jobs/[id]/route");

const MOCK_USER = { id: "employer-abc" };
type MockQueryResult = {
  data: { id: string; active: boolean } | null;
  error: { message: string; code?: string } | null;
};

function makeRequest(body = {}): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-123", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function makeContext(id = "job-123") {
  return { params: Promise.resolve({ id }) };
}

function makeEmployerQuery(resolvedValue: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return query;
}

function makeUpdateQuery(resolvedValue: unknown) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return query;
}

function setup({
  user = MOCK_USER as typeof MOCK_USER | null,
  employerResult = { data: { id: MOCK_USER.id }, error: null },
  updateResult = { data: { id: "job-123", active: false }, error: null },
}: {
  user?: typeof MOCK_USER | null;
  employerResult?: MockQueryResult;
  updateResult?: MockQueryResult;
} = {}) {
  const employerQuery = makeEmployerQuery(employerResult);
  const updateQuery = makeUpdateQuery(updateResult);

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "employers") return employerQuery;
      if (table === "jobs") return updateQuery;
      throw new Error(`Unexpected auth table in mock: ${table}`);
    }),
  });

  mockCreateServiceRoleClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "jobs") return updateQuery;
      throw new Error(`Unexpected service table in mock: ${table}`);
    }),
  });

  return { employerQuery, updateQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
});

describe("PATCH /api/jobs/:id", () => {
  it("returns 401 if no authenticated user", async () => {
    setup({ user: null });

    const res = await PATCH(makeRequest({ active: false }), makeContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("updates only the authenticated employer's matching job", async () => {
    const { updateQuery } = setup();

    const payload = { role: "New Role", active: false };
    const res = await PATCH(makeRequest(payload), makeContext("job-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateQuery.update).toHaveBeenCalledWith(payload);
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "job-123");
    expect(updateQuery.eq).toHaveBeenCalledWith("posted_by", MOCK_USER.id);
  });

  it("returns 400 if body is empty", async () => {
    setup();
    const res = await PATCH(makeRequest({}), makeContext());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No fields to update provided");
  });

  it("returns 404 if no owned job matched the requested id", async () => {
    setup({
      updateResult: {
        data: null,
        error: { message: "not found", code: "PGRST116" },
      },
    });

    const res = await PATCH(makeRequest({ active: true }), makeContext("missing-job"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found or unauthorized");
  });
});
