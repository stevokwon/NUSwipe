import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSingle, mockFrom } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}));

// Lazy import after mocks are registered
const { POST } = await import("@/app/api/apply/confirm/route");

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/apply/confirm", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// The confirm route now does one atomic query:
// .update({...}).eq("extension_token", token).select("id").single()
function mockChain(resolvedValue: unknown) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/apply/confirm", () => {
  it("valid token → 200, success", async () => {
    mockChain({ data: { id: "app-1" }, error: null });

    const res = await POST(makeReq({ extensionToken: "tok-123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("invalid token (not found) → 404", async () => {
    mockChain({ data: null, error: { message: "not found" } });

    const res = await POST(makeReq({ extensionToken: "no-such-token" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found or already used");
  });

  it("missing extensionToken in body → 400", async () => {
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("extensionToken required");
  });

  it("empty string extensionToken → 400", async () => {
    const res = await POST(makeReq({ extensionToken: "" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("extensionToken required");
  });
});
