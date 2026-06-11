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

const { DELETE } = await import("@/app/api/jobs/[id]/route");

const MOCK_USER = { id: "employer-abc" };
type MockQueryResult = {
  data: { id: string } | null;
  error: { message: string; code?: string } | null;
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-123", {
    method: "DELETE",
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

function makeDeleteQuery(resolvedValue: unknown) {
  const query = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return query;
}

function setup({
  user = MOCK_USER as typeof MOCK_USER | null,
  employerResult = { data: { id: MOCK_USER.id }, error: null },
  deleteResult = { data: { id: "job-123" }, error: null },
}: {
  user?: typeof MOCK_USER | null;
  employerResult?: MockQueryResult;
  deleteResult?: MockQueryResult;
} = {}) {
  const employerQuery = makeEmployerQuery(employerResult);
  const deleteQuery = makeDeleteQuery(deleteResult);

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "employers") return employerQuery;
      if (table === "jobs") return deleteQuery;
      throw new Error(`Unexpected auth table in mock: ${table}`);
    }),
  });

  mockCreateServiceRoleClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "jobs") return deleteQuery;
      throw new Error(`Unexpected service table in mock: ${table}`);
    }),
  });

  return { employerQuery, deleteQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
});

describe("DELETE /api/jobs/:id", () => {
  it("returns 401 if no authenticated user", async () => {
    setup({ user: null });

    const res = await DELETE(makeRequest(), makeContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 403 if the user is not an employer", async () => {
    setup({ employerResult: { data: null, error: { message: "not found" } } });

    const res = await DELETE(makeRequest(), makeContext());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden: Only employers can delete jobs");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated employer's matching job", async () => {
    const { employerQuery, deleteQuery } = setup();

    const res = await DELETE(makeRequest(), makeContext("job-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(employerQuery.eq).toHaveBeenCalledWith("id", MOCK_USER.id);
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "job-123");
    expect(deleteQuery.eq).toHaveBeenCalledWith("posted_by", MOCK_USER.id);
  });

  it("falls back to the session client when no service-role key is configured", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { deleteQuery } = setup();

    const res = await DELETE(makeRequest(), makeContext("job-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith("posted_by", MOCK_USER.id);
  });

  it("returns 404 if no owned job matched the requested id", async () => {
    setup({
      deleteResult: {
        data: null,
        error: { message: "not found", code: "PGRST116" },
      },
    });

    const res = await DELETE(makeRequest(), makeContext("missing-job"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Job not found or unauthorized");
  });
});
