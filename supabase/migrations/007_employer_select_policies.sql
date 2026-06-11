-- Migration 007: Add missing SELECT policies for employers
-- Allows employers to view their own jobs (including inactive ones),
-- applications for their jobs, and the profiles of candidates who applied.

-- 1. SELECT policy for jobs
-- This allows employers to see all their jobs, regardless of whether 'active' is true or false.
DROP POLICY IF EXISTS "Employers can view their own posted jobs" ON jobs;
CREATE POLICY "Employers can view their own posted jobs"
  ON jobs FOR SELECT
  USING (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM employers
      WHERE id = auth.uid()
    )
  );

-- 2. SELECT policy for applications
-- This allows employers to see applications for any job they have posted.
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON applications;
CREATE POLICY "Employers can view applications for their jobs"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM employers e
          WHERE e.id = auth.uid()
        )
    )
  );

-- 3. SELECT policy for candidate profiles (previously 'profiles', now 'candidates')
-- This allows employers to see the details of candidates who have applied to their jobs.
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON candidates;
CREATE POLICY "Employers can view applicant profiles"
  ON candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = candidates.id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM employers e
          WHERE e.id = auth.uid()
        )
    )
  );
