import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedJobs } from "@/scripts/seed-jobs";
import type { SeedResult } from "@/scripts/seed-jobs";

// ── CSV fixtures ─────────────────────────────────────────────────────────────

const CSV_HEADER =
  "company,role,location,division,description,visa_sponsorship,salary_range,ats_type,ats_board_token,ats_job_id,ats_fallback_url,logo_url,tags";

const VALID_3_ROW_CSV = [
  CSV_HEADER,
  "Grab,SWE Intern,SG,Technology,,true,SGD 1000,greenhouse,grab,12345,,,",
  "Shopee,PM Intern,SG,Product,,false,,lever,shopee,abc-uuid,,,",
  "HSBC,Summer Analyst,HK,IBD,,true,,url,,,https://careers.hsbc.com/job,,finance|internship",
].join("\n");

const MISSING_COMPANY_CSV = [CSV_HEADER, ",SWE Intern,SG,,,true,,greenhouse,grab,12345,,,"].join(
  "\n"
);

const URL_NO_FALLBACK_CSV = [
  CSV_HEADER,
  "HSBC,Summer Analyst,HK,,,true,,url,,,,, ",
].join("\n");

// ── Mock Supabase client ──────────────────────────────────────────────────────

const mockUpsert = vi.fn();
const mockSupabase = {
  from: vi.fn(() => ({ upsert: mockUpsert })),
};

type SeedClient = Parameters<typeof seedJobs>[1];

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("seedJobs", () => {
  it("valid 3-row CSV → upsert called once with correct shape", async () => {
    const result: SeedResult = await seedJobs(
      VALID_3_ROW_CSV,
      mockSupabase as unknown as SeedClient
    );

    expect(result.errors).toHaveLength(0);
    expect(result.inserted).toBe(3);

    expect(mockUpsert).toHaveBeenCalledOnce();
    const rows = mockUpsert.mock.calls[0][0] as unknown[];
    expect(rows).toHaveLength(3);

    // Row 0: Grab — visa_sponsorship coerced to boolean true, tags empty array
    expect(rows[0]).toMatchObject({
      company: "Grab",
      role: "SWE Intern",
      visa_sponsorship: true,
      ats_type: "greenhouse",
      tags: [],
    });

    // Row 2: HSBC — url type with fallback URL, tags parsed from pipe-separated string
    expect(rows[2]).toMatchObject({
      ats_type: "url",
      ats_fallback_url: "https://careers.hsbc.com/job",
      tags: ["finance", "internship"],
    });
  });

  it("invalid row (missing company) → error reported, upsert never called", async () => {
    const result: SeedResult = await seedJobs(
      MISSING_COMPANY_CSV,
      mockSupabase as unknown as SeedClient
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/company/i);
    expect(result.inserted).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("--dry-run flag → validated but upsert never called", async () => {
    const result: SeedResult = await seedJobs(
      VALID_3_ROW_CSV,
      mockSupabase as unknown as SeedClient,
      { dryRun: true }
    );

    expect(result.errors).toHaveLength(0);
    expect(result.inserted).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("ats_type 'url' with no ats_fallback_url → cross-field error, upsert never called", async () => {
    const result: SeedResult = await seedJobs(
      URL_NO_FALLBACK_CSV,
      mockSupabase as unknown as SeedClient
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/ats_fallback_url/i);
    expect(result.inserted).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
