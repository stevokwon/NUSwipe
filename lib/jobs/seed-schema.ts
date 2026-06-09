import { z } from "zod";

/**
 * Zod schema for a single row in the jobs CSV seed file.
 *
 * Maps directly to the `jobs` table columns in supabase/migrations/001_init.sql.
 * DB-managed fields (id, active, created_at) are excluded — the upsert script
 * sets active=true by default and lets Postgres generate id + created_at.
 *
 * visa_sponsorship accepts "true" or "false" (CSV strings are always strings)
 * and transforms to boolean before upsert.
 *
 * tags accepts a pipe-separated string (e.g. "fintech|intern|SWE") and
 * transforms to TEXT[] for storage.
 *
 * Cross-field rule: ats_type === "url" requires ats_fallback_url to be present.
 */
export const JobSeedRowSchema = z
  .object({
    company: z.string().min(1, "company is required"),
    role: z.string().min(1, "role is required"),
    location: z.string().min(1, "location is required"),
    division: z.string().optional(),
    description: z.string().optional(),
    visa_sponsorship: z
      .enum(["true", "false"], {
        message: 'visa_sponsorship must be "true" or "false"',
      })
      .transform((v) => v === "true"),
    salary_range: z.string().optional(),
    ats_type: z.enum(["greenhouse", "lever", "url"], {
      message: 'ats_type must be "greenhouse", "lever", or "url"',
    }),
    ats_board_token: z.string().optional(),
    ats_job_id: z.string().optional(),
    ats_fallback_url: z.string().optional(),
    logo_url: z.string().optional(),
    tags: z
      .string()
      .optional()
      .transform((v): string[] =>
        v ? v.split("|").map((t) => t.trim()).filter(Boolean) : []
      ),
  })
  .refine(
    (data) =>
      data.ats_type !== "url" ||
      (data.ats_fallback_url != null && data.ats_fallback_url.length > 0),
    {
      message: "ats_fallback_url is required when ats_type is 'url'",
      path: ["ats_fallback_url"],
    }
  );

export type JobSeedRow = z.infer<typeof JobSeedRowSchema>;
