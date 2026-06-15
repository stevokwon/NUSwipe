-- Migration 009: Smart Form Fill — extended candidate profile
-- Adds fields needed to auto-answer common ATS screening questions
-- without requiring an LLM call (Phase 1 of smart form fill).
--
-- Sections added:
--   Education    : degree_type, website_url
--   Availability : current_city, availability_date, notice_period,
--                  years_experience, preferred_work_type, preferred_location
--   Compensation : expected_salary_sgd, expected_salary_hkd, open_to_negotiation
--   EEO          : gender, ethnicity, disability_status, veteran_status
--   Screening    : referral_source, cover_letter_default

-- ── Education ───────────────────────────────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS degree_type        TEXT,       -- 'Bachelor''s' | 'Master''s' | 'PhD' | 'Diploma'
  ADD COLUMN IF NOT EXISTS website_url        TEXT;       -- portfolio / personal site

-- ── Availability & work preferences ─────────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS current_city       TEXT,       -- e.g. 'Singapore', 'Hong Kong'
  ADD COLUMN IF NOT EXISTS availability_date  DATE,       -- earliest start date
  ADD COLUMN IF NOT EXISTS notice_period      TEXT,       -- 'Immediate' | '2 weeks' | '1 month' | '3 months'
  ADD COLUMN IF NOT EXISTS years_experience   TEXT,       -- '0' | '<1' | '1-2' | '3-5' | '5+'
  ADD COLUMN IF NOT EXISTS preferred_work_type TEXT[] DEFAULT '{}',  -- ['Full-time','Internship','Part-time']
  ADD COLUMN IF NOT EXISTS preferred_location  TEXT[] DEFAULT '{}';  -- ['SG','HK','Remote','Open']

-- ── Compensation ─────────────────────────────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS expected_salary_sgd    INTEGER,   -- monthly SGD
  ADD COLUMN IF NOT EXISTS expected_salary_hkd    INTEGER,   -- monthly HKD
  ADD COLUMN IF NOT EXISTS open_to_negotiation    BOOLEAN DEFAULT TRUE;

-- ── EEO / Diversity (all optional, stored for autofill only) ─────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS gender            TEXT,   -- 'Male'|'Female'|'Non-binary'|'Prefer not to say'
  ADD COLUMN IF NOT EXISTS ethnicity         TEXT,   -- 'Asian'|'White'|'Hispanic'|'Black'|'Mixed'|'Prefer not to say'
  ADD COLUMN IF NOT EXISTS disability_status TEXT,   -- 'No'|'Yes'|'Prefer not to say'
  ADD COLUMN IF NOT EXISTS veteran_status    TEXT;   -- 'Not a veteran'|'Veteran'|'Prefer not to say'

-- ── Additional screening ──────────────────────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS referral_source       TEXT,   -- 'LinkedIn'|'University career fair'|'NUSwipe'|'Other'
  ADD COLUMN IF NOT EXISTS cover_letter_default  TEXT;   -- short default cover letter paragraph (~200 chars)
