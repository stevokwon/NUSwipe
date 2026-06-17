-- ============================================================
-- NUSwipe seed data — verified APAC intern & fresh-grad jobs
-- Last verified: June 2026
--
-- NOTE: Lever/Greenhouse job IDs expire when postings close.
-- Re-verify and refresh IDs at the start of each hiring cycle.
-- Hiring cycles in SG: Jan (H1), May (summer), Aug (H2).
--
-- HOW TO ADD JOBS:
-- 1. Lever: ats_board_token = slug, ats_job_id = UUID from jobs.lever.co/{slug}/{uuid}
-- 2. Greenhouse: ats_board_token = token, ats_job_id = numeric ID
--    Form is at boards.greenhouse.io/{token}/jobs/{id}
-- 3. Other ATS: ats_type='url', ats_fallback_url=<direct link to career page>
--
-- IMPORTANT: lever/greenhouse jobs submit REAL applications on swipe-right.
--            Use ats_type='url' for companies on Workday/Ashby/own ATS.
--
-- To apply: paste into Supabase SQL editor → Run
-- ============================================================

-- Clear all existing jobs (clean slate)
TRUNCATE jobs RESTART IDENTITY CASCADE;

INSERT INTO jobs (company, role, location, division, description, visa_sponsorship, salary_range, ats_type, ats_board_token, ats_job_id, ats_fallback_url, logo_url, tags) VALUES

-- ============================================================
-- LEVER (jobs.lever.co) — URL-verified June 2026
-- ============================================================

-- ── Binance Accelerator Program ───────────────────────────────────────────────

('Binance', 'Accelerator Program — Software Engineer (AI/LLM)', 'Singapore',
 'Engineering',
 'Binance Accelerator Program is a fixed-term early-career program. Build AI/LLM-powered features for the world''s largest crypto exchange alongside experienced engineers. Min. 6 months full-time commitment.',
 TRUE, 'SGD 4,000 / month',
 'lever', 'binance', 'fe2b0bf9-95bb-40c5-959b-f991278a1cbe',
 'https://jobs.lever.co/binance/fe2b0bf9-95bb-40c5-959b-f991278a1cbe',
 NULL,
 ARRAY['SWE', 'AI', 'LLM', 'crypto', 'Web3', 'internship', 'SG', 'visa']
),

('Binance', 'Accelerator Program — Applied AI Application Engineer', 'Singapore',
 'Engineering',
 'Build production AI applications and agent workflows at Binance. You will work on LLM integrations, backend services, and AI system architecture from day one as part of the Accelerator early-career cohort.',
 TRUE, 'SGD 4,000 / month',
 'lever', 'binance', 'ef77ec2f-1ffa-49bc-a18d-9f019ca1edae',
 'https://jobs.lever.co/binance/ef77ec2f-1ffa-49bc-a18d-9f019ca1edae',
 NULL,
 ARRAY['SWE', 'AI', 'LLM', 'crypto', 'internship', 'SG', 'visa']
),

('Binance', 'Accelerator Program — Applied AI Agent Developer', 'Singapore',
 'Engineering',
 'Build AI agents and tool integrations for Binance''s products as part of the Tech Seeds 2026 cohort. Hands-on builder role at the intersection of LLMs and production systems.',
 TRUE, 'SGD 4,000 / month',
 'lever', 'binance', '0b78f793-4313-4a2a-a4cb-8cbeb2bc7d7b',
 'https://jobs.lever.co/binance/0b78f793-4313-4a2a-a4cb-8cbeb2bc7d7b',
 NULL,
 ARRAY['AI', 'agents', 'LLM', 'crypto', 'internship', 'SG', 'visa']
),

('Binance', 'Accelerator Program — AI Intelligence Efficiency Engineer', 'Singapore',
 'Engineering',
 'Improve AI workflows and model efficiency at Binance as part of the Accelerator Program. Work on evaluation pipelines, prompt engineering, and optimisation of production AI systems.',
 TRUE, 'SGD 4,000 / month',
 'lever', 'binance', 'b3f90add-c407-45c9-b306-05b06d9a8054',
 'https://jobs.lever.co/binance/b3f90add-c407-45c9-b306-05b06d9a8054',
 NULL,
 ARRAY['AI', 'ML', 'crypto', 'internship', 'SG', 'visa']
),

-- ── ShopBack ─────────────────────────────────────────────────────────────────

('ShopBack', 'Data Analyst Intern (H2 2026)', 'Singapore',
 'Data & Analytics',
 'ShopBack powers rewards and cashback for 40M+ shoppers across APAC. As a Data Analyst Intern you will build dashboards, run SQL analyses, and deliver insights that directly influence product and marketing decisions.',
 FALSE, 'SGD 2,500 / month',
 'lever', 'shopback-2', '829b4802-b364-49e5-81df-2324f4b0c254',
 'https://jobs.lever.co/shopback-2/829b4802-b364-49e5-81df-2324f4b0c254',
 NULL,
 ARRAY['data', 'analytics', 'SQL', 'internship', 'SG', 'e-commerce']
),


-- ── GoTo Group ────────────────────────────────────────────────────────────────

('GoTo Group', 'Data Scientist Intern', 'Singapore',
 'Data & Analytics',
 'GoTo Group — parent of Gojek and Tokopedia — is Southeast Asia''s largest digital ecosystem. This Singapore-based role embeds you in a data science team working on deep learning and computer vision for KYC and fintech systems.',
 FALSE, NULL,
 'lever', 'GoToGroup', '92aa37d3-08bf-4dc6-b5a6-432b1737ff9c',
 'https://jobs.lever.co/GoToGroup/92aa37d3-08bf-4dc6-b5a6-432b1737ff9c',
 NULL,
 ARRAY['data-science', 'ML', 'computer-vision', 'internship', 'SG', 'super-app']
);
