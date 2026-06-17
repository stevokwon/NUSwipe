/**
 * Clears all jobs and re-inserts from the verified seed list.
 * Run: npx tsx --env-file=.env.local scripts/run-seed.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const jobs = [
  // ── Binance Accelerator Program (Lever, verified June 2026) ──────────────
  {
    company: "Binance",
    role: "Accelerator Program — Software Engineer (AI/LLM)",
    location: "Singapore",
    division: "Engineering",
    description:
      "Binance Accelerator Program is a fixed-term early-career program. Build AI/LLM-powered features for the world's largest crypto exchange alongside experienced engineers. Min. 6 months full-time commitment.",
    visa_sponsorship: true,
    salary_range: "SGD 4,000 / month",
    ats_type: "lever",
    ats_board_token: "binance",
    ats_job_id: "fe2b0bf9-95bb-40c5-959b-f991278a1cbe",
    ats_fallback_url: "https://jobs.lever.co/binance/fe2b0bf9-95bb-40c5-959b-f991278a1cbe",
    logo_url: null,
    tags: ["SWE", "AI", "LLM", "crypto", "Web3", "internship", "SG", "visa"],
    active: true,
  },
  {
    company: "Binance",
    role: "Accelerator Program — Applied AI Application Engineer",
    location: "Singapore",
    division: "Engineering",
    description:
      "Build production AI applications and agent workflows at Binance. Work on LLM integrations, backend services, and AI system architecture from day one as part of the Accelerator early-career cohort.",
    visa_sponsorship: true,
    salary_range: "SGD 4,000 / month",
    ats_type: "lever",
    ats_board_token: "binance",
    ats_job_id: "ef77ec2f-1ffa-49bc-a18d-9f019ca1edae",
    ats_fallback_url: "https://jobs.lever.co/binance/ef77ec2f-1ffa-49bc-a18d-9f019ca1edae",
    logo_url: null,
    tags: ["SWE", "AI", "LLM", "crypto", "internship", "SG", "visa"],
    active: true,
  },
  {
    company: "Binance",
    role: "Accelerator Program — Applied AI Agent Developer",
    location: "Singapore",
    division: "Engineering",
    description:
      "Build AI agents and tool integrations for Binance's products as part of the Tech Seeds 2026 cohort. Hands-on builder role at the intersection of LLMs and production systems.",
    visa_sponsorship: true,
    salary_range: "SGD 4,000 / month",
    ats_type: "lever",
    ats_board_token: "binance",
    ats_job_id: "0b78f793-4313-4a2a-a4cb-8cbeb2bc7d7b",
    ats_fallback_url: "https://jobs.lever.co/binance/0b78f793-4313-4a2a-a4cb-8cbeb2bc7d7b",
    logo_url: null,
    tags: ["AI", "agents", "LLM", "crypto", "internship", "SG", "visa"],
    active: true,
  },
  {
    company: "Binance",
    role: "Accelerator Program — AI Intelligence Efficiency Engineer",
    location: "Singapore",
    division: "Engineering",
    description:
      "Improve AI workflows and model efficiency at Binance as part of the Accelerator Program. Work on evaluation pipelines, prompt engineering, and optimisation of production AI systems.",
    visa_sponsorship: true,
    salary_range: "SGD 4,000 / month",
    ats_type: "lever",
    ats_board_token: "binance",
    ats_job_id: "b3f90add-c407-45c9-b306-05b06d9a8054",
    ats_fallback_url: "https://jobs.lever.co/binance/b3f90add-c407-45c9-b306-05b06d9a8054",
    logo_url: null,
    tags: ["AI", "ML", "crypto", "internship", "SG", "visa"],
    active: true,
  },
  // ── ShopBack (Lever, verified June 2026) ─────────────────────────────────
  {
    company: "ShopBack",
    role: "Data Analyst Intern (H2 2026)",
    location: "Singapore",
    division: "Data & Analytics",
    description:
      "ShopBack powers rewards and cashback for 40M+ shoppers across APAC. As a Data Analyst Intern you will build dashboards, run SQL analyses, and deliver insights that directly influence product and marketing decisions.",
    visa_sponsorship: false,
    salary_range: "SGD 2,500 / month",
    ats_type: "lever",
    ats_board_token: "shopback-2",
    ats_job_id: "829b4802-b364-49e5-81df-2324f4b0c254",
    ats_fallback_url: "https://jobs.lever.co/shopback-2/829b4802-b364-49e5-81df-2324f4b0c254",
    logo_url: null,
    tags: ["data", "analytics", "SQL", "internship", "SG", "e-commerce"],
    active: true,
  },
  {
    company: "ShopBack",
    role: "Product Management Intern",
    location: "Singapore",
    division: "Product",
    description:
      "Drive features from ideation to launch at one of APAC's leading cashback platforms. Work with engineering, design, and data teams to define product strategy and ship improvements used by millions of shoppers.",
    visa_sponsorship: false,
    salary_range: "SGD 2,800 / month",
    ats_type: "lever",
    ats_board_token: "shopback-2",
    ats_job_id: "8dbcb810-cf5f-4306-a049-d8ecbadb3eeb",
    ats_fallback_url: "https://jobs.lever.co/shopback-2/8dbcb810-cf5f-4306-a049-d8ecbadb3eeb",
    logo_url: null,
    tags: ["product", "PM", "internship", "SG", "e-commerce"],
    active: true,
  },
  // ── GoTo Group (Lever, verified June 2026) ────────────────────────────────
  {
    company: "GoTo Group",
    role: "Data Scientist Intern",
    location: "Singapore",
    division: "Data & Analytics",
    description:
      "GoTo Group — parent of Gojek and Tokopedia — is Southeast Asia's largest digital ecosystem. This Singapore-based role embeds you in a data science team working on deep learning and computer vision for KYC and fintech systems.",
    visa_sponsorship: false,
    salary_range: null,
    ats_type: "lever",
    ats_board_token: "GoToGroup",
    ats_job_id: "92aa37d3-08bf-4dc6-b5a6-432b1737ff9c",
    ats_fallback_url: "https://jobs.lever.co/GoToGroup/92aa37d3-08bf-4dc6-b5a6-432b1737ff9c",
    logo_url: null,
    tags: ["data-science", "ML", "computer-vision", "internship", "SG", "super-app"],
    active: true,
  },
];

async function main() {
  console.log("Clearing existing jobs...");
  const { error: delError } = await supabase
    .from("jobs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

  if (delError) {
    console.error("Delete failed:", delError.message);
    process.exit(1);
  }
  console.log("Cleared.");

  console.log(`Inserting ${jobs.length} jobs...`);
  const { data, error } = await supabase.from("jobs").insert(jobs as any).select("id, company, role");

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`\nInserted ${data?.length ?? 0} jobs:`);
  data?.forEach((j: any) => console.log(`  ✓ [${j.id.slice(0, 8)}] ${j.company} — ${j.role}`));
}

main();
