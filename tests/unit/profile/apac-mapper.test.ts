import { describe, it, expect, vi, afterEach } from "vitest";
import { buildApacPayload } from "@/lib/profile/apac-mapper";
import { logger } from "@/lib/logger";
import type { Profile } from "@/lib/types";

// ── Test fixture helpers ─────────────────────────────────────────────────────

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "test-user-id",
    first_name: "Jane",
    last_name: "Doe",
    preferred_name: null,
    email: "jane@example.com",
    phone_country_code: "+65",
    phone_number: "91234567",
    sg_residency: null,
    ns_status: null,
    sg_university: null,
    hk_residency: null,
    hk_university: null,
    major: null,
    minor: null,
    gpa: null,
    grad_month_year: null,
    resume_url: null,
    linkedin_url: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Test suite ───────────────────────────────────────────────────────────────

describe("buildApacPayload", () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it("maps SG Citizen + NS Completed to correct questionAnswers shape", () => {
    const profile = makeProfile({
      sg_residency: "Citizen",
      ns_status: "Completed",
      sg_university: "NUS",
      major: "Computer Science",
      gpa: "4.50 / 5.00",
      grad_month_year: "May 2026",
    });

    const payload = buildApacPayload(profile);

    // Must return both top-level keys
    expect(payload).toHaveProperty("questionAnswers");
    expect(payload).toHaveProperty("educationAnswers");

    // questionAnswers must contain the SG context
    const questions = payload.questionAnswers.map((q) => q.question);
    expect(questions).toContain("Singapore Residency Status");
    expect(questions).toContain("National Service Status");
    expect(questions).toContain("University");

    // Values are present and correct
    const sgRes = payload.questionAnswers.find(
      (q) => q.question === "Singapore Residency Status"
    );
    const nsStatus = payload.questionAnswers.find(
      (q) => q.question === "National Service Status"
    );
    expect(sgRes?.answer).toBe("Citizen");
    expect(nsStatus?.answer).toBe("Completed");

    // Education answers are correctly populated
    expect(payload.educationAnswers.major).toBe("Computer Science");
    expect(payload.educationAnswers.gradDate).toBe("May 2026");
    expect(payload.educationAnswers.gpa).toBe("4.50 / 5.00");
  });

  it("maps HK IANG Visa Holder independently of SG fields", () => {
    const profile = makeProfile({
      sg_residency: "Not Applicable",
      ns_status: "Not Applicable",
      hk_residency: "IANG Visa Holder",
      hk_university: "HKU",
      major: "Finance",
      grad_month_year: "Dec 2025",
    });

    const payload = buildApacPayload(profile);

    const questions = payload.questionAnswers.map((q) => q.question);
    expect(questions).toContain("Hong Kong Residency Status");
    expect(questions).toContain("University");
    // SG fields marked Not Applicable must NOT appear in output
    expect(questions).not.toContain("Singapore Residency Status");
    expect(questions).not.toContain("National Service Status");

    const hkRes = payload.questionAnswers.find(
      (q) => q.question === "Hong Kong Residency Status"
    );
    expect(hkRes?.answer).toBe("IANG Visa Holder");
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles fully null APAC fields without crashing", () => {
    const profile = makeProfile(); // all APAC fields null

    expect(() => buildApacPayload(profile)).not.toThrow();

    const payload = buildApacPayload(profile);
    // No residency / NS questions when all null
    const questions = payload.questionAnswers.map((q) => q.question);
    expect(questions).not.toContain("Singapore Residency Status");
    expect(questions).not.toContain("National Service Status");
    expect(questions).not.toContain("Hong Kong Residency Status");

    // Education answers degrade gracefully to empty strings / null
    expect(payload.educationAnswers.major).toBe("");
    expect(payload.educationAnswers.gradDate).toBe("");
    expect(payload.educationAnswers.gpa).toBeNull();
  });

  it("omits fields explicitly set to 'Not Applicable'", () => {
    const profile = makeProfile({
      sg_residency: "Not Applicable",
      ns_status: "Not Applicable",
      hk_residency: "Not Applicable",
    });

    const payload = buildApacPayload(profile);
    const questions = payload.questionAnswers.map((q) => q.question);

    expect(questions).not.toContain("Singapore Residency Status");
    expect(questions).not.toContain("National Service Status");
    expect(questions).not.toContain("Hong Kong Residency Status");
  });

  it("includes minor when present", () => {
    const profile = makeProfile({
      major: "Computer Science",
      minor: "Finance",
    });

    const payload = buildApacPayload(profile);
    const minor = payload.questionAnswers.find(
      (q) => q.question === "Minor / Second Major"
    );
    expect(minor?.answer).toBe("Finance");
  });

  it("omits minor when null", () => {
    const profile = makeProfile({ major: "Computer Science", minor: null });

    const payload = buildApacPayload(profile);
    const questions = payload.questionAnswers.map((q) => q.question);
    expect(questions).not.toContain("Minor / Second Major");
  });

  it("logs a warning with field name only when an unrecognised residency value is encountered", () => {
    const warnSpy = vi.spyOn(logger, "warn");

    const profile = makeProfile({
      sg_residency: "UNKNOWN_VALUE_XYZ", // not in the known enum
    });

    buildApacPayload(profile);

    expect(warnSpy).toHaveBeenCalledOnce();

    // The warn call must contain the field NAME
    const [meta] = warnSpy.mock.calls[0] as [Record<string, unknown>, string];
    expect(meta).toHaveProperty("field", "sg_residency");

    // PRIVACY: the actual field value must NOT appear anywhere in the log metadata
    const metaJson = JSON.stringify(meta);
    expect(metaJson).not.toContain("UNKNOWN_VALUE_XYZ");
    expect(meta).not.toHaveProperty("value");
    expect(meta).not.toHaveProperty("fieldValue");
  });

  // ── Privacy test ───────────────────────────────────────────────────────────

  it("PRIVACY — never logs sensitive field values in normal operation", () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const infoSpy = vi.spyOn(logger, "info");
    const errorSpy = vi.spyOn(logger, "error");

    const sensitiveValues = [
      "Citizen",
      "Permanent Resident",
      "Employment Pass Required",
      "Completed",
      "Exemption",
      "IANG Visa Holder",
      "Visa Required",
    ];

    // Full profile with all sensitive fields populated
    const profile = makeProfile({
      sg_residency: "Citizen",
      ns_status: "Completed",
      sg_university: "NUS",
      hk_residency: "IANG Visa Holder",
      hk_university: "HKU",
      major: "Computer Science",
      gpa: "4.50",
      grad_month_year: "May 2026",
    });

    buildApacPayload(profile);

    // Gather all logger call arguments across all levels
    const allLogCalls = [
      ...warnSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...errorSpy.mock.calls,
    ];

    for (const [meta] of allLogCalls as Array<[Record<string, unknown>, string]>) {
      const metaJson = JSON.stringify(meta);
      for (const sensitiveValue of sensitiveValues) {
        expect(metaJson).not.toContain(sensitiveValue);
      }
    }

    // In normal (valid input) operation, no warnings should be emitted at all
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
