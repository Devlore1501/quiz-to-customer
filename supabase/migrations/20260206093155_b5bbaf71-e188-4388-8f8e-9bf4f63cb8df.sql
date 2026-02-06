
-- Fix survey_submissions policies: make them PERMISSIVE
DROP POLICY IF EXISTS "Admin delete access" ON public.survey_submissions;
DROP POLICY IF EXISTS "Admin read access" ON public.survey_submissions;
DROP POLICY IF EXISTS "Admin update access" ON public.survey_submissions;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.survey_submissions;
DROP POLICY IF EXISTS "Allow public inserts" ON public.survey_submissions;

-- Admin-only SELECT (PERMISSIVE)
CREATE POLICY "Admin read access"
  ON public.survey_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only UPDATE
CREATE POLICY "Admin update access"
  ON public.survey_submissions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE
CREATE POLICY "Admin delete access"
  ON public.survey_submissions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public INSERT (needed for survey form)
CREATE POLICY "Allow public inserts"
  ON public.survey_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix user_roles policies: make them PERMISSIVE
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Admin-only SELECT
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only INSERT
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also fix partial_submissions policies while we're at it
DROP POLICY IF EXISTS "Admin delete access" ON public.partial_submissions;
DROP POLICY IF EXISTS "Admin read access" ON public.partial_submissions;
DROP POLICY IF EXISTS "Allow public inserts" ON public.partial_submissions;
DROP POLICY IF EXISTS "Allow public updates by session" ON public.partial_submissions;

-- Admin-only SELECT
CREATE POLICY "Admin read access"
  ON public.partial_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE
CREATE POLICY "Admin delete access"
  ON public.partial_submissions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public INSERT (needed for tracking)
CREATE POLICY "Allow public inserts"
  ON public.partial_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public UPDATE by session (needed for tracking updates)
CREATE POLICY "Allow public updates by session"
  ON public.partial_submissions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
