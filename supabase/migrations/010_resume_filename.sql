-- Persist the original uploaded resume filename so the profile UI can show it after refresh.
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_filename TEXT;
