-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- profiles
-- APAC-aware user profile, linked to Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name      TEXT,
  last_name       TEXT,
  preferred_name  TEXT,
  email           TEXT,
  phone_country_code TEXT DEFAULT '+65',   -- +65 SG / +852 HK
  phone_number    TEXT,

  -- Singapore context
  sg_residency    TEXT,   -- 'Citizen' | 'Permanent Resident' | 'Employment Pass Required'
  ns_status       TEXT,   -- 'Completed' | 'Exemption' | 'Not Applicable'
  sg_university   TEXT,   -- 'NUS' | 'NTU' | 'SMU' | 'SUTD' | 'Other'

  -- Hong Kong context
  hk_residency    TEXT,   -- 'Permanent Resident' | 'IANG Visa Holder' | 'Visa Required'
  hk_university   TEXT,   -- 'HKU' | 'HKUST' | 'CUHK' | 'Other'

  -- Academic
  major           TEXT,
  minor           TEXT,
  gpa             TEXT,
  grad_month_year TEXT,   -- e.g. "May 2026"

  -- Documents
  resume_url      TEXT,   -- Supabase Storage public URL
  linkedin_url    TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security: users can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- NOTE: Profile row is created client-side in app/(auth)/signup/page.tsx
-- after successful auth.signUp(). A DB trigger on auth.users is avoided
-- because Supabase free tier restricts SECURITY DEFINER triggers on auth schema.

-- ============================================================
-- jobs
-- Curated MNC job listings (seeded manually)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company         TEXT NOT NULL,
  role            TEXT NOT NULL,
  location        TEXT NOT NULL,         -- 'SG' | 'HK' | 'SG / HK'
  division        TEXT,                  -- 'Technology' | 'IBD' | 'Operations' | etc.
  description     TEXT,
  visa_sponsorship BOOLEAN DEFAULT FALSE,
  salary_range    TEXT,                  -- e.g. "SGD 5,000 - 6,500 / month"

  -- ATS integration config
  ats_type        TEXT NOT NULL,         -- 'greenhouse' | 'lever' | 'url'
  ats_board_token TEXT,                  -- Greenhouse: board token from URL
  ats_job_id      TEXT,                  -- Greenhouse/Lever: job post ID
  ats_fallback_url TEXT,                 -- Direct career page URL (fallback)

  logo_url        TEXT,                  -- Company logo for job card
  tags            TEXT[] DEFAULT '{}',   -- e.g. ['fintech', 'summer-internship', 'SWE']
  active          BOOLEAN DEFAULT TRUE,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- All authenticated users can read jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active jobs"
  ON jobs FOR SELECT USING (auth.role() = 'authenticated' AND active = TRUE);

-- ============================================================
-- applications
-- Tracks each user's swipe-right / submitted applications
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id              UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status              TEXT DEFAULT 'applied',  -- 'applied' | 'interviewing' | 'offer' | 'rejected'
  ats_submission_id   TEXT,                    -- ID returned by Greenhouse/Lever on success
  notes               TEXT,
  applied_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, job_id)  -- prevent duplicate applications
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications"
  ON applications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON applications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- skipped_jobs
-- Tracks swipe-left (archived) so we don't re-show them
-- ============================================================
CREATE TABLE IF NOT EXISTS skipped_jobs (
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id    UUID REFERENCES jobs(id) ON DELETE CASCADE,
  skipped_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

ALTER TABLE skipped_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own skips"
  ON skipped_jobs FOR ALL USING (auth.uid() = user_id);
