import { describe, it, expect } from "vitest";
import { submitToFallback } from "@/lib/ats/fallback";

describe("submitToFallback", () => {
  // Happy path
  it("returns a redirect result with the fallback URL", () => {
    const result = submitToFallback({
      ats_fallback_url: "https://careers.example.com/job/123",
    });
    expect(result.kind).toBe("redirect");
    expect(result.url).toBe("https://careers.example.com/job/123");
  });

  // Edge: null URL
  it("throws when ats_fallback_url is null", () => {
    expect(() => submitToFallback({ ats_fallback_url: null })).toThrow(
      "No fallback URL configured for this job"
    );
  });

  // Edge: empty string (falsy — treated same as null)
  it("throws when ats_fallback_url is an empty string", () => {
    expect(() => submitToFallback({ ats_fallback_url: "" })).toThrow(
      "No fallback URL configured for this job"
    );
  });

  // Return shape is assignable to the redirect branch of ApplyResult
  it("return value is structurally compatible with ApplyResult redirect branch", () => {
    const result = submitToFallback({ ats_fallback_url: "https://example.com" });
    // TypeScript structural check: both fields present and correct type
    expect(typeof result.kind).toBe("string");
    expect(typeof result.url).toBe("string");
  });
});
