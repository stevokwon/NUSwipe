/**
 * Job seeding script — validates a CSV file and upserts rows into the jobs table.
 *
 * Usage:
 *   npx ts-node scripts/seed-jobs.ts [path/to/jobs.csv] [--dry-run]
 *
 * Defaults to supabase/jobs.csv if no path is given.
 * --dry-run validates the CSV and prints rows without touching the database.
 *
 * New dependency: papaparse (CSV parsing for non-engineer job curation workflow)
 */

import Papa from "papaparse";
import { JobSeedRowSchema, type JobSeedRow } from "@/lib/jobs/seed-schema";

// Minimal structural interface — the script only needs from().upsert().
// Using a structural type instead of SupabaseClient<Database> avoids generated
// schema coupling and keeps the function independently testable.
interface JobsClient {
  from(table: "jobs"): {
    // PromiseLike covers both the real PostgrestFilterBuilder (which extends
    // PromiseLike but not Promise) and the vi.fn().mockResolvedValue() mock.
    upsert(rows: object[]): PromiseLike<{ error: { message: string } | null }>;
  };
}

export interface SeedResult {
  inserted: number;
  errors: string[];
}

/**
 * Parses, validates, and upserts jobs from a CSV string.
 *
 * All rows are validated before any upsert is attempted — if any row fails,
 * the function returns all errors and does not touch the database.
 */
export async function seedJobs(
  csvContent: string,
  supabase: JobsClient,
  options: { dryRun?: boolean } = {}
): Promise<SeedResult> {
  const { dryRun = false } = options;

  const { data: rows, errors: parseErrors } = Papa.parse<Record<string, string>>(
    csvContent,
    { header: true, skipEmptyLines: true }
  );

  if (parseErrors.length > 0) {
    return {
      inserted: 0,
      errors: parseErrors.map(
        (e) => `Parse error at row ${e.row ?? "?"}: ${e.message}`
      ),
    };
  }

  const validRows: JobSeedRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];

    // CSV values are always strings. Convert empty strings to undefined so
    // optional Zod fields are handled correctly (empty string ≠ missing field).
    const cleaned = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v])
    );

    const result = JobSeedRowSchema.safeParse(cleaned);
    if (!result.success) {
      const fieldErrors = result.error.issues
        .map((issue) => `  ${issue.path.join(".") || "row"}: ${issue.message}`)
        .join("\n");
      errors.push(
        `Row ${i + 2} (${raw["company"] ?? "?"}/${raw["role"] ?? "?"}):\n${fieldErrors}`
      );
    } else {
      validRows.push(result.data);
    }
  }

  if (errors.length > 0) {
    return { inserted: 0, errors };
  }

  if (dryRun) {
    return { inserted: 0, errors: [] };
  }

  const { error: upsertError } = await supabase.from("jobs").upsert(validRows);
  if (upsertError) {
    return { inserted: 0, errors: [`Upsert failed: ${upsertError.message}`] };
  }

  return { inserted: validRows.length, errors: [] };
}

// ── CLI entry point ───────────────────────────────────────────────────────────
// Only runs when executed directly via ts-node, not when imported in tests.

async function main(): Promise<void> {
  const { readFileSync } = await import("fs");
  const { createClient } = await import("@supabase/supabase-js");

  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith("--")) ?? "supabase/jobs.csv";
  const dryRun = args.includes("--dry-run");

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    process.exit(1);
  }

  const csvContent = readFileSync(csvPath, "utf-8");
  const supabase = createClient(url, key);

  const { inserted, errors } = await seedJobs(csvContent, supabase, { dryRun });

  if (errors.length > 0) {
    errors.forEach((e) => console.error(e));
    process.exit(1);
  }

  const action = dryRun ? "[dry-run] validated" : "seeded";
  console.log(`${action} ${dryRun ? validatedCount(csvContent) : inserted} jobs`);
}

function validatedCount(csv: string): number {
  return csv.split("\n").filter((l) => l.trim() && !l.startsWith("company,")).length;
}

// CommonJS entry point detection (ts-node default)
if (typeof require !== "undefined" && require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
