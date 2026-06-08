-- Migration: 002_pending_status
-- Adds 'pending' to the allowed application status values.
--
-- Background: URL-fallback jobs (ats_type = 'url') redirect the user to the
-- company career page in a new tab.  We cannot confirm they submitted — so the
-- tracker records them as 'pending', not 'applied', until the user manually
-- marks the application complete.
--
-- This migration adds a CHECK constraint to enforce the exhaustive enum at the
-- DB layer.  Previously the column had no constraint (TEXT DEFAULT 'applied').
-- The constraint is added in two steps to handle any rows that may already
-- exist in development environments.

-- Step 1: Ensure all existing rows carry a valid status before constraining.
UPDATE applications
SET status = 'applied'
WHERE status NOT IN ('applied', 'interviewing', 'offer', 'rejected', 'pending');

-- Step 2: Add the CHECK constraint.
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied', 'interviewing', 'offer', 'rejected', 'pending'));

-- Step 3: Update the default to remain 'applied' for direct ATS submissions.
-- (No change needed — default is already 'applied'.)
