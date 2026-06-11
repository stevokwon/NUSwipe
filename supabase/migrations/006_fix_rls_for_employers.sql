-- Migration: 006_fix_rls_for_employers
-- Drops policies referencing the deleted 'profiles' table and replaces them 
-- with policies referencing the 'employers' table.

-- 1. Drop old policies
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON profiles;
-- Note: 'profiles' table is deleted, so these policies might already be gone, 
-- but we ensure they are dropped if they still exist in the policy metadata.
-- For jobs and applications, we drop the specific policies created in 003_employer_support
DROP POLICY IF EXISTS "Employers can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Employers can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Employers can update applications for their jobs" ON applications;

-- 2. Create new policies for jobs
CREATE POLICY "Employers can update their own jobs"
  ON jobs FOR UPDATE
  USING (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM employers
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Employers can delete their own jobs"
  ON jobs FOR DELETE
  USING (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM employers
      WHERE id = auth.uid()
    )
  );

-- 3. Create new policies for applications
CREATE POLICY "Employers can update applications for their jobs"
  ON applications FOR UPDATE
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
  )
  WITH CHECK (
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
