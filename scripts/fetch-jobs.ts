/**
 * fetch-jobs.ts — Fetches open positions from Greenhouse + Lever public APIs
 * and upserts new jobs into the Supabase jobs table.
 *
 * Usage:
 *   npm run jobs:fetch              # fetch all companies + upsert
 *   npm run jobs:fetch -- --dry-run # print fetched jobs, no DB writes
 *   npm run jobs:fetch -- --company stripe  # single company
 *
 * Long-term note: once the employer portal is live, job ingestion shifts to
 * employers posting directly. This script is the bridge for the pilot phase.
 */

// ── Company config ─────────────────────────────────────────────────────────────

interface CompanyConfig {
  company: string;
  ats_type: "greenhouse" | "lever";
  ats_board_token: string;
  logo_url: string | null;
  /** Conservative default — public APIs don't expose visa sponsorship */
  visa_sponsorship: boolean;
  /** Lowercase substrings to filter by location (empty = keep all) */
  location_filter: string[];
  /** Salary hint to show on cards — can't be fetched from public ATS APIs */
  salary_hint: string | null;
}

const COMPANIES: CompanyConfig[] = [
  // ── Greenhouse ──────────────────────────────────────────────────────────────
  {
    company: "Stripe",
    ats_type: "greenhouse",
    ats_board_token: "stripe",
    logo_url: null,
    visa_sponsorship: true,
    location_filter: ["singapore", " sg", "hong kong"],
    salary_hint: "SGD 6,000–8,000 / month",
  },
  {
    company: "Shopee",
    ats_type: "greenhouse",
    ats_board_token: "shopee",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: ["singapore", "hong kong"],
    salary_hint: null,
  },
  {
    company: "HoYoverse",
    ats_type: "greenhouse",
    ats_board_token: "hoyoverse",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: ["singapore", "hong kong"],
    salary_hint: null,
  },
  {
    company: "OKX",
    ats_type: "greenhouse",
    ats_board_token: "okx",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: [],
    salary_hint: null,
  },
  // ── Lever ───────────────────────────────────────────────────────────────────
  {
    company: "Nium",
    ats_type: "lever",
    ats_board_token: "nium",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: ["singapore", "hong kong"],
    salary_hint: null,
  },
  {
    company: "ShopBack",
    ats_type: "lever",
    ats_board_token: "shopback",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: ["singapore", "hong kong"],
    salary_hint: null,
  },
  {
    company: "Binance",
    ats_type: "lever",
    ats_board_token: "binance-1",
    logo_url: null,
    visa_sponsorship: false,
    location_filter: ["singapore", "hong kong"],
    salary_hint: null,
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface FetchedJob {
  company: string;
  role: string;
  location: string;
  division: string | null;
  description: string | null;
  visa_sponsorship: boolean;
  salary_range: string | null;
  ats_type: "greenhouse" | "lever";
  ats_board_token: string;
  ats_job_id: string;
  ats_fallback_url: string | null;
  logo_url: string | null;
  tags: string[];
  active: boolean;
  posted_by: null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 800); // cap for card display
}

function matchesLocation(location: string, filter: string[]): boolean {
  if (filter.length === 0) return true;
  const loc = location.toLowerCase();
  return filter.some((f) => loc.includes(f));
}

// ── Greenhouse fetcher ─────────────────────────────────────────────────────────

async function fetchGreenhouse(cfg: CompanyConfig): Promise<FetchedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${cfg.ats_board_token}/jobs?content=true`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  [GH] ${cfg.company}: HTTP ${res.status} — skipping`);
    return [];
  }
  const data = await res.json() as { jobs: Array<{
    id: number;
    title: string;
    location: { name: string };
    departments: Array<{ name: string }>;
    content: string;
    absolute_url: string;
    updated_at: string;
  }> };

  return (data.jobs ?? [])
    .filter((j) => matchesLocation(j.location?.name ?? "", cfg.location_filter))
    .map((j) => ({
      company: cfg.company,
      role: j.title,
      location: j.location?.name ?? "Singapore",
      division: j.departments?.[0]?.name ?? null,
      description: j.content ? stripHtml(j.content) : null,
      visa_sponsorship: cfg.visa_sponsorship,
      salary_range: cfg.salary_hint,
      ats_type: "greenhouse" as const,
      ats_board_token: cfg.ats_board_token,
      ats_job_id: String(j.id),
      ats_fallback_url: j.absolute_url ?? null,
      logo_url: cfg.logo_url,
      tags: j.departments?.map((d) => d.name) ?? [],
      active: true,
      posted_by: null,
    }));
}

// ── Lever fetcher ──────────────────────────────────────────────────────────────

async function fetchLever(cfg: CompanyConfig): Promise<FetchedJob[]> {
  const url = `https://api.lever.co/v0/postings/${cfg.ats_board_token}?mode=json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  [LV] ${cfg.company}: HTTP ${res.status} — skipping`);
    return [];
  }
  const data = await res.json() as Array<{
    id: string;
    text: string;
    location: string;
    descriptionPlain: string;
    hostedUrl: string;
    tags: string[];
    categories: { team?: string; commitment?: string };
    createdAt: number;
  }>;

  return (data ?? [])
    .filter((j) => matchesLocation(j.location ?? "", cfg.location_filter))
    .map((j) => ({
      company: cfg.company,
      role: j.text,
      location: j.location ?? "Singapore",
      division: j.categories?.team ?? null,
      description: j.descriptionPlain ? j.descriptionPlain.slice(0, 800) : null,
      visa_sponsorship: cfg.visa_sponsorship,
      salary_range: cfg.salary_hint,
      ats_type: "lever" as const,
      ats_board_token: cfg.ats_board_token,
      ats_job_id: j.id,
      ats_fallback_url: j.hostedUrl ?? null,
      logo_url: cfg.logo_url,
      tags: j.tags ?? [],
      active: true,
      posted_by: null,
    }));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const companyFilter = args.find((a) => a.startsWith("--company="))?.split("=")[1]
    ?? (args[args.indexOf("--company") + 1] !== undefined && !args[args.indexOf("--company") + 1].startsWith("--")
      ? args[args.indexOf("--company") + 1]
      : undefined);

  const targets = companyFilter
    ? COMPANIES.filter((c) => c.ats_board_token === companyFilter || c.company.toLowerCase() === companyFilter.toLowerCase())
    : COMPANIES;

  if (targets.length === 0) {
    console.error(`No company found matching "${companyFilter}". Available: ${COMPANIES.map((c) => c.ats_board_token).join(", ")}`);
    process.exit(1);
  }

  console.log(`Fetching jobs for ${targets.length} company/ies${dryRun ? " [DRY RUN]" : ""}...`);

  const fetched: FetchedJob[] = [];
  for (const cfg of targets) {
    process.stdout.write(`  ${cfg.company} (${cfg.ats_type})... `);
    try {
      const jobs = cfg.ats_type === "greenhouse"
        ? await fetchGreenhouse(cfg)
        : await fetchLever(cfg);
      console.log(`${jobs.length} job(s)`);
      fetched.push(...jobs);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nTotal fetched: ${fetched.length} job(s)`);

  if (dryRun) {
    console.log("\n── Sample (first 3) ──────────────────────────────────────────");
    fetched.slice(0, 3).forEach((j) => {
      console.log(`  ${j.company} — ${j.role} [${j.location}] ats_job_id=${j.ats_job_id}`);
    });
    console.log("\nDry run complete — no DB writes.");
    return;
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    console.error("Error: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.");
    console.error("Tip: run with --dry-run to validate without a DB connection.");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);

  // Dedup: skip any (ats_board_token, ats_job_id) pairs already in the DB
  const tokens = [...new Set(targets.map((c) => c.ats_board_token))];
  const { data: existing } = await supabase
    .from("jobs")
    .select("ats_board_token, ats_job_id")
    .in("ats_board_token", tokens);

  const existingKeys = new Set(
    (existing ?? []).map((r: { ats_board_token: string; ats_job_id: string }) =>
      `${r.ats_board_token}::${r.ats_job_id}`
    )
  );

  const newJobs = fetched.filter(
    (j) => !existingKeys.has(`${j.ats_board_token}::${j.ats_job_id}`)
  );
  const skipped = fetched.length - newJobs.length;

  console.log(`  ${skipped} already in DB — skipping`);
  console.log(`  ${newJobs.length} new job(s) to insert`);

  if (newJobs.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  const { error } = await supabase.from("jobs").insert(newJobs);
  if (error) {
    console.error("Insert error:", error.message);
    process.exit(1);
  }

  console.log(`✓ Inserted ${newJobs.length} new job(s).`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
