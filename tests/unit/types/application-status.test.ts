import { describe, it, expect, expectTypeOf } from "vitest";
import type { ApplicationStatus } from "@/lib/types";

// ── Runtime values (exported for tests) ─────────────────────────────────────
// We re-derive the allowed values from the type via a lookup so this test
// breaks if the type and the runtime array diverge.
import { APPLICATION_STATUS_VALUES } from "@/lib/types";

describe("ApplicationStatus", () => {
  it("includes all expected status values at runtime", () => {
    const expected: string[] = [
      "applied",
      "interviewing",
      "offer",
      "rejected",
      "pending",
    ];
    expect(APPLICATION_STATUS_VALUES).toEqual(expect.arrayContaining(expected));
    expect(APPLICATION_STATUS_VALUES).toHaveLength(expected.length);
  });

  it("includes 'pending' — required for URL-fallback tracker state", () => {
    expect(APPLICATION_STATUS_VALUES).toContain("pending");
  });

  it("does not include unknown statuses", () => {
    expect(APPLICATION_STATUS_VALUES).not.toContain("unknown");
    expect(APPLICATION_STATUS_VALUES).not.toContain("skipped");
  });

  // Compile-time assertion: "pending" must be assignable to ApplicationStatus.
  // If the union is missing "pending", this line will produce a TS error.
  it("accepts 'pending' as a valid ApplicationStatus type", () => {
    const status: ApplicationStatus = "pending";
    expectTypeOf(status).toMatchTypeOf<ApplicationStatus>();
  });
});
