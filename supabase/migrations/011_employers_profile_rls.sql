-- Ensure employers can read and update only their own recruiter profile.
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view their own profile"
  ON employers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Employers can insert their own profile"
  ON employers FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Employers can update their own profile"
  ON employers FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
