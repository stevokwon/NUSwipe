import { describe, it, expect } from "vitest";
import { JobSeedRowSchema } from "@/lib/jobs/seed-schema";

const validRow = {
  company: "Grab",
  role: "Software Engineer Intern",
  location: "SG",
  visa_sponsorship: "true",
  ats_type: "greenhouse",
  ats_board_token: "grab",
  ats_job_id: "4567890",
};

describe("JobSeedRowSchema", () => {
  it("valid row passes and coerces visa_sponsorship to boolean", () => {
    const result = JobSeedRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visa_sponsorship).toBe(true);
      expect(result.data.tags).toEqual([]);
    }
  });

  it("missing company fails", () => {
    const { company: _company, ...row } = validRow;
    expect(JobSeedRowSchema.safeParse(row).success).toBe(false);
  });

  it("ats_type 'workday' fails enum", () => {
    expect(
      JobSeedRowSchema.safeParse({ ...validRow, ats_type: "workday" }).success
    ).toBe(false);
  });

  it("visa_sponsorship 'yes' fails coercion", () => {
    expect(
      JobSeedRowSchema.safeParse({ ...validRow, visa_sponsorship: "yes" }).success
    ).toBe(false);
  });

  it("ats_type 'url' with no ats_fallback_url fails cross-field rule", () => {
    const result = JobSeedRowSchema.safeParse({
      ...validRow,
      ats_type: "url",
      ats_board_token: undefined,
      ats_job_id: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.flatMap((i) => i.path);
      expect(paths).toContain("ats_fallback_url");
    }
  });
});
