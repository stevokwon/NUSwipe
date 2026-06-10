-- Sprint 3: Add skills, target_role, and embedding placeholders to profiles
-- Also add extension_token to applications and embedding placeholder to jobs

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_role TEXT,
  ADD COLUMN IF NOT EXISTS embedding vector(384);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS extension_token UUID UNIQUE;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS embedding vector(384);
