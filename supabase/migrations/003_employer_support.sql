-- Migration: 003_employer_support
-- Adds employer support, roles, and RLS updates for employers to post jobs and review applications.

-- 1. Add role column to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('candidate', 'employer')) DEFAULT 'candidate';

-- 2. Add posted_by column to jobs table
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Update profiles RLS: Allow employers to view applicant profiles
CREATE POLICY "Employers can view applicant profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = profiles.id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'employer'
        )
    )
  );

-- 4. Update jobs RLS: Allow employers to manage their jobs
CREATE POLICY "Employers can view their own posted jobs"
  ON jobs FOR SELECT
  USING (
    auth.uid() = posted_by
  );

CREATE POLICY "Employers can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employer'
    )
  );

CREATE POLICY "Employers can update their own jobs"
  ON jobs FOR UPDATE
  USING (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employer'
    )
  );

CREATE POLICY "Employers can delete their own jobs"
  ON jobs FOR DELETE
  USING (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employer'
    )
  );

-- 5. Update applications RLS: Allow employers to view/update applications for their jobs
CREATE POLICY "Employers can view applications for their jobs"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'employer'
        )
    )
  );

CREATE POLICY "Employers can update applications for their jobs"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'employer'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
        AND j.posted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'employer'
        )
    )
  );
