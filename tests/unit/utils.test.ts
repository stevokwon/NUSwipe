import { describe, it, expect, vi } from "vitest";
import { getCompanyLogoCandidates } from "../../lib/utils";

describe("getCompanyLogoCandidates", () => {
  it("returns custom logo URL if provided", () => {
    const url = "https://example.com/logo.png";
    expect(getCompanyLogoCandidates("Test", url)).toContain(url);
  });

  it("handles known hard-to-guess domains (e.g. P&G -> pg.com)", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGOKIT_TOKEN", "test-token");
    const urls = getCompanyLogoCandidates("Procter & Gamble");
    expect(urls[0]).toContain("pg.com");
    vi.unstubAllEnvs();
  });

  it("returns multiple candidates for multi-word company names", () => {
    vi.stubEnv("NEXT_PUBLIC_LOGOKIT_TOKEN", "test-token");
    const urls = getCompanyLogoCandidates("Goldman Sachs");
    // Should try both first word and joined words
    expect(urls).toContain("https://img.logokit.com/goldmansachs.com?token=test-token&size=256&fallback=404");
    expect(urls).toContain("https://img.logokit.com/goldman.com?token=test-token&size=256&fallback=404");
    vi.unstubAllEnvs();
  });

  it("handles domain-like company names directly", () => {
    const urls = getCompanyLogoCandidates("google.com");
    expect(urls[0]).toContain("google.com");
  });
});
