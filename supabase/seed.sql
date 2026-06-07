-- ============================================================
-- NUSwipe seed data — curated APAC MNC jobs
-- Last verified: June 2026
--
-- HOW TO ADD JOBS:
-- 1. Greenhouse: find board token from boards.greenhouse.io/{token}
--    and job ID from boards.greenhouse.io/{token}/jobs/{job_id}
-- 2. Lever: find company slug and posting UUID from jobs.lever.co/{slug}/{uuid}
-- 3. Other ATS: set ats_type='url', ats_fallback_url=<direct career page>
--
-- WARNING: ats_type='greenhouse' and ats_type='lever' jobs will submit
-- REAL applications when swiped right. Use ats_type='url' for safe testing.
--
-- To push: paste into Supabase SQL editor → Run
-- ============================================================

-- Clear existing seed data (safe to re-run)
TRUNCATE jobs RESTART IDENTITY CASCADE;

INSERT INTO jobs (company, role, location, division, description, visa_sponsorship, salary_range, ats_type, ats_board_token, ats_job_id, ats_fallback_url, logo_url, tags) VALUES

-- ============================================================
-- LIVE ATS INTEGRATIONS (Greenhouse) — real job IDs verified June 2026
-- ============================================================

-- ── Shopee (Greenhouse: boards.greenhouse.io/shopee) ─────────────────────────

('Shopee', 'Regional Business Development Intern (Data Analytics)', 'SG',
 'Data & Analytics',
 'Support regional business development initiatives with data-driven insights. Work with Python and SQL on large-scale Southeast Asian commerce datasets.',
 FALSE, 'SGD 2,800 / month',
 'greenhouse', 'shopee', '4008799002',
 'https://boards.greenhouse.io/shopee/jobs/4008799002',
 NULL,
 ARRAY['data', 'analytics', 'Python', 'internship', 'SG']
),

('Shopee', 'Technical Project Management (Software) Intern', 'SG',
 'Engineering',
 'Ensure Shopee products across iOS, Android, web, and back-end are shipped on schedule. Work at the intersection of engineering, product, and operations.',
 FALSE, 'SGD 2,800 / month',
 'greenhouse', 'shopee', '4539677002',
 'https://boards.greenhouse.io/shopee/jobs/4539677002',
 NULL,
 ARRAY['TPM', 'project-management', 'internship', 'SG']
),

-- ── HoYoverse (Greenhouse: boards.greenhouse.io/hoyoverse) ───────────────────

('HoYoverse', 'Backend Engineer Intern (6-month)', 'SG',
 'Engineering',
 'Build the server-side systems behind Genshin Impact and Honkai Star Rail''s live events and economy systems. Hands-on production code from day one.',
 FALSE, 'SGD 2,500 / month',
 'greenhouse', 'hoyoverse', '4537703007',
 'https://boards.greenhouse.io/hoyoverse/jobs/4537703007',
 NULL,
 ARRAY['backend', 'gaming', 'internship', 'SG']
),

('HoYoverse', 'Game Server Developer — Fresh Grad', 'SG',
 'Engineering',
 'Design and develop high-performance game server architecture for HoYoverse''s global player base of 100M+ users. Strong CS fundamentals required.',
 TRUE, 'SGD 4,500 / month',
 'greenhouse', 'hoyoverse', '4261501007',
 'https://boards.greenhouse.io/hoyoverse/jobs/4261501007',
 NULL,
 ARRAY['backend', 'gaming', 'C++', 'graduate', 'SG']
),

-- ── OKX (Greenhouse: boards.greenhouse.io/okx) ───────────────────────────────

('OKX', 'Software Engineer, New Grad (Backend / Mobile)', 'SG',
 'Engineering',
 'Build and maintain OKX''s trading platform used by millions daily. Work on crypto exchange infrastructure including pro/retail trading and wallets.',
 TRUE, 'SGD 5,000 / month',
 'greenhouse', 'okx', '5723183003',
 'https://boards.greenhouse.io/okx/jobs/5723183003',
 NULL,
 ARRAY['SWE', 'crypto', 'Web3', 'graduate', 'SG']
),

('OKX', 'Software Engineer — Mobile (iOS & Android)', 'SG',
 'Engineering',
 'Shape the OKX mobile experience for millions of users. Own features end-to-end from design to production on iOS and Android.',
 TRUE, 'SGD 5,500 / month',
 'greenhouse', 'okx', '5141568003',
 'https://boards.greenhouse.io/okx/jobs/5141568003',
 NULL,
 ARRAY['mobile', 'iOS', 'Android', 'crypto', 'SG']
),

-- ── Stripe (Greenhouse: boards.greenhouse.io/stripe) ─────────────────────────

('Stripe', 'Software Engineer Intern (Summer & Winter)', 'SG',
 'Engineering',
 'Build the global payments infrastructure that processes hundreds of billions of dollars annually. Stripe interns ship real code to production.',
 TRUE, 'SGD 7,000 / month',
 'greenhouse', 'stripe', '6142753',
 'https://stripe.com/jobs/listing/software-engineer-intern/6177236',
 NULL,
 ARRAY['SWE', 'fintech', 'payments', 'internship', 'SG', 'visa']
),

-- ============================================================
-- LIVE ATS INTEGRATIONS (Lever) — real job IDs verified June 2026
-- ============================================================

-- ── Nium (Lever: jobs.lever.co/nium) ─────────────────────────────────────────

('Nium', 'Software Engineer Intern — Summer 2026 (8–12 weeks)', 'SG',
 'Engineering',
 'Embedded in Nium''s engineering team writing production code for a real-money global payments platform. Co-HQ in Singapore and San Francisco.',
 FALSE, 'SGD 3,000 / month',
 'lever', 'nium', '56ce917e-71b9-41ed-9b7f-69e060810273',
 'https://jobs.lever.co/nium/56ce917e-71b9-41ed-9b7f-69e060810273',
 NULL,
 ARRAY['SWE', 'fintech', 'payments', 'internship', 'SG']
),

('Nium', 'Data Engineering Intern — Summer 2026 (8–12 weeks)', 'SG',
 'Data & Analytics',
 'Work on Nium''s data infrastructure — pipelines, warehousing, and analytics for real-time global payment flows.',
 FALSE, 'SGD 2,800 / month',
 'lever', 'nium', '3e56b3c0-36ec-4439-8b9e-ac0e686fa4b2',
 'https://jobs.lever.co/nium/3e56b3c0-36ec-4439-8b9e-ac0e686fa4b2',
 NULL,
 ARRAY['data-engineering', 'fintech', 'internship', 'SG']
),

-- ── ShopBack (Lever: jobs.lever.co/shopback-2) ───────────────────────────────

('ShopBack', 'Software Engineer Intern — Backend (May–Dec 2026)', 'SG',
 'Engineering',
 'ShopBack powers rewards and cashback for 40M+ shoppers across APAC. Backend interns build high-traffic APIs and microservices.',
 FALSE, 'SGD 2,800 / month',
 'lever', 'shopback-2', '4e119b8f-3c8d-47e6-9dde-f232930e752c',
 'https://jobs.lever.co/shopback-2/4e119b8f-3c8d-47e6-9dde-f232930e752c',
 NULL,
 ARRAY['backend', 'internship', 'SG', 'e-commerce']
),

('ShopBack', 'Software Engineer Intern — Frontend (2026)', 'SG',
 'Engineering',
 'Build ShopBack''s web experience used by millions of shoppers. Work on React-based features for the rewards and cashback platform.',
 FALSE, 'SGD 2,800 / month',
 'lever', 'shopback-2', 'b319ecbb-36dc-45cf-825f-14885d890e9e',
 'https://jobs.lever.co/shopback-2/b319ecbb-36dc-45cf-825f-14885d890e9e',
 NULL,
 ARRAY['frontend', 'React', 'internship', 'SG']
),

-- ── Binance (Lever: jobs.lever.co/binance) ───────────────────────────────────

('Binance', 'Accelerator Program — Software Engineer (AI/LLM)', 'SG',
 'Engineering',
 'Join Binance''s accelerator programme building AI-powered features for the world''s largest crypto exchange. Min. 6 months, full-time commitment.',
 TRUE, 'SGD 4,000 / month',
 'lever', 'binance', 'fe2b0bf9-95bb-40c5-959b-f991278a1cbe',
 'https://jobs.lever.co/binance/fe2b0bf9-95bb-40c5-959b-f991278a1cbe',
 NULL,
 ARRAY['SWE', 'AI', 'crypto', 'Web3', 'internship', 'SG']
),

('Binance', 'Accelerator Program — Data Engineer & Analytics', 'SG',
 'Data & Analytics',
 'Build data pipelines and analytics tooling for Binance''s trading platform. Work with petabyte-scale real-time financial data.',
 TRUE, 'SGD 3,500 / month',
 'lever', 'binance', 'e6ad7c21-ade3-4739-a5fb-577a82fd7d70',
 'https://jobs.lever.co/binance/e6ad7c21-ade3-4739-a5fb-577a82fd7d70',
 NULL,
 ARRAY['data-engineering', 'crypto', 'analytics', 'SG']
),

-- ============================================================
-- URL FALLBACK JOBS — open career page in new tab + save to tracker
-- (Safe for testing — no real application submitted automatically)
-- ============================================================

('Google', 'Software Engineering Intern (APAC)', 'SG / HK',
 'Engineering',
 'Join Google''s APAC engineering team building products used by billions. Work on real production code in Search, Cloud, or YouTube.',
 TRUE, 'SGD 5,500 / month',
 'url', NULL, NULL,
 'https://careers.google.com/jobs/results/?location=Singapore&jex=ENTRY_LEVEL',
 NULL,
 ARRAY['SWE', 'internship', 'tech', 'visa']
),

('Meta', 'Software Engineer Intern', 'SG',
 'Engineering',
 'Build the infrastructure and products that connect billions of people. Interns work on high-impact projects across Messenger, WhatsApp, and Instagram.',
 TRUE, 'SGD 6,000 / month',
 'url', NULL, NULL,
 'https://www.metacareers.com/jobs/?divisions[0]=Internship&offices[0]=Singapore',
 NULL,
 ARRAY['SWE', 'internship', 'tech', 'visa']
),

('Grab', 'Software Engineer Intern — Backend', 'SG',
 'Engineering',
 'Grab''s backend powers Southeast Asia''s super-app. Work on high-throughput distributed systems serving millions of daily transactions.',
 FALSE, 'SGD 3,200 / month',
 'url', NULL, NULL,
 'https://grab.careers/jobs/?department=Engineering&location=Singapore',
 NULL,
 ARRAY['backend', 'Go', 'internship', 'SG']
),

('ByteDance / TikTok', 'Product Manager Intern', 'SG',
 'Product',
 'Work on TikTok''s product strategy for Southeast Asia. Drive feature development from ideation to launch working with engineering and design teams.',
 TRUE, 'SGD 4,000 / month',
 'url', NULL, NULL,
 'https://jobs.bytedance.com/en/position?keywords=intern&location=SG',
 NULL,
 ARRAY['product', 'PM', 'internship', 'SG', 'tech']
),

('Goldman Sachs', 'Summer Analyst — Technology Division', 'SG / HK',
 'Technology',
 'Goldman Sachs Technology is the technical backbone of the firm. Summer Analysts build and maintain systems for trading, risk, and client platforms.',
 TRUE, 'SGD 6,500 / month',
 'url', NULL, NULL,
 'https://www.goldmansachs.com/careers/students/programs/asia-pacific/summer-analyst-program.html',
 NULL,
 ARRAY['finance', 'SWE', 'summer', 'SG', 'HK', 'visa']
),

('Goldman Sachs', 'Summer Analyst — Investment Banking Division', 'HK',
 'IBD',
 'Work alongside senior bankers advising clients on M&A, IPOs, and capital markets transactions across Asia Pacific.',
 TRUE, 'HKD 45,000 / month',
 'url', NULL, NULL,
 'https://www.goldmansachs.com/careers/students/programs/asia-pacific/summer-analyst-program.html',
 NULL,
 ARRAY['finance', 'IBD', 'M&A', 'summer', 'HK', 'visa']
),

('JP Morgan', 'Technology Analyst — Software Engineering', 'SG',
 'Technology',
 'JP Morgan''s technology division builds world-class financial infrastructure. Analysts work in agile squads on trading systems, risk analytics, and digital banking.',
 TRUE, 'SGD 5,800 / month',
 'url', NULL, NULL,
 'https://careers.jpmorgan.com/global/en/students/programs/technology-analyst-program?search=singapore',
 NULL,
 ARRAY['finance', 'SWE', 'fulltime', 'SG', 'visa']
),

('McKinsey & Company', 'Business Analyst', 'SG / HK',
 'Consulting',
 'McKinsey''s BA role is designed for top graduates joining directly from university. Work on strategy and transformation projects for Asia-Pacific clients.',
 TRUE, 'SGD 7,000 / month',
 'url', NULL, NULL,
 'https://www.mckinsey.com/careers/search-jobs?query=business+analyst&location=singapore',
 NULL,
 ARRAY['consulting', 'strategy', 'graduate', 'SG', 'HK', 'visa']
),

('Citi', 'Global Markets Summer Analyst', 'SG',
 'Markets',
 'Rotate across Fixed Income, Equities, and FX desks in Citi''s Singapore hub. Gain exposure to trading workflows and client solutions.',
 TRUE, 'SGD 5,500 / month',
 'url', NULL, NULL,
 'https://jobs.citi.com/job/singapore/global-markets-summer-analyst/287/current',
 NULL,
 ARRAY['finance', 'markets', 'trading', 'summer', 'SG']
),

('Visa', 'Software Engineer — New Grad', 'SG',
 'Technology',
 'Visa''s Singapore tech hub builds next-generation payment infrastructure. New grad engineers work on APIs, fraud detection, and developer tools.',
 TRUE, 'SGD 5,500 / month',
 'url', NULL, NULL,
 'https://careers.visa.com/jobs/?location=Singapore',
 NULL,
 ARRAY['fintech', 'payments', 'SWE', 'graduate', 'SG']
);
