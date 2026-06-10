import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockUpdate,
  mockEqUpdate,
  mockSingle,
  mockEqSelect,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockEqUpdate: vi.fn(),
  mockSingle: vi.fn(),
  mockEqSelect: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
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

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  mockSelect.mockReturnValue({ eq: mockEqSelect });
  mockEqSelect.mockReturnValue({ single: mockSingle });
  mockUpdate.mockReturnValue({ eq: mockEqUpdate });
  mockEqUpdate.mockResolvedValue({ error: null });
});

describe("POST /api/apply/confirm", () => {
  it("valid token → 200, success", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "app-1", status: "pending", extension_token: "tok-123" },
      error: null,
    });

    const res = await POST(makeReq({ extensionToken: "tok-123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockEqUpdate).toHaveBeenCalled();
  });

  it("invalid token (not found) → 404", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const res = await POST(makeReq({ extensionToken: "no-such-token" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found");
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
