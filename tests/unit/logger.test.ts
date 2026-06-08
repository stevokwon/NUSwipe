import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { logger } from "@/lib/logger";

// ── Spies ─────────────────────────────────────────────────────────────────────

let spyInfo: ReturnType<typeof vi.spyOn>;
let spyWarn: ReturnType<typeof vi.spyOn>;
let spyError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  spyInfo  = vi.spyOn(console, "info").mockImplementation(() => {});
  spyWarn  = vi.spyOn(console, "warn").mockImplementation(() => {});
  spyError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs(); // restore NODE_ENV to "test" between cases
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("logger", () => {
  // ── Format output shape ─────────────────────────────────────────────────

  it("formats output as [LEVEL]{meta} message when NODE_ENV is not test", () => {
    vi.stubEnv("NODE_ENV", "production");

    logger.warn({ field: "sg_residency" }, "test warning");

    expect(spyWarn).toHaveBeenCalledOnce();
    const [formatted] = spyWarn.mock.calls[0] as [string];
    expect(formatted).toBe('[WARN] {"field":"sg_residency"} test warning');
  });

  it("omits meta braces when meta object is empty", () => {
    vi.stubEnv("NODE_ENV", "production");

    logger.warn({}, "bare message");

    const [formatted] = spyWarn.mock.calls[0] as [string];
    expect(formatted).toBe("[WARN] bare message");
  });

  // ── NODE_ENV suppression ────────────────────────────────────────────────

  it("suppresses info() and warn() when NODE_ENV is 'test'", () => {
    // Vitest sets NODE_ENV=test by default — no override needed
    logger.info({ field: "major" }, "should be silent");
    logger.warn({ field: "ns_status" }, "should be silent");

    expect(spyInfo).not.toHaveBeenCalled();
    expect(spyWarn).not.toHaveBeenCalled();
  });

  // ── error() always logs ─────────────────────────────────────────────────

  it("error() always calls console.error regardless of NODE_ENV", () => {
    // In test env (default):
    logger.error({ field: "resume_url" }, "critical failure");
    expect(spyError).toHaveBeenCalledOnce();
    const [formatted] = spyError.mock.calls[0] as [string];
    expect(formatted).toContain("[ERROR]");
    expect(formatted).toContain("critical failure");
  });
});
