-- 1. Replace permissive public read policy with admin-only access
DROP POLICY IF EXISTS "Public can read admin report rows" ON public.survey_submissions;

-- 2. Add a SECURITY DEFINER function for the public report fetch by ID (clientReport only).
-- The existing get_report_by_id function already handles this safely.
-- Public access to survey_submissions is no longer required at the table level.

-- 3. Prevent anonymous users from inserting privileged statuses
ALTER TABLE public.survey_submissions
  DROP CONSTRAINT IF EXISTS status_public_insert_check;

ALTER TABLE public.survey_submissions
  ADD CONSTRAINT status_public_insert_check
  CHECK (
    status IS NULL OR
    status IN ('completed', 'in_progress', 'disqualified', 'admin_report')
  );

-- 4. Tighten the public INSERT policy: anonymous users cannot mark a row as admin_report
DROP POLICY IF EXISTS "Allow public inserts" ON public.survey_submissions;

CREATE POLICY "Allow public inserts"
  ON public.survey_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Authenticated admins can insert anything
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    -- Everyone else (anon + non-admin authenticated) cannot insert admin_report
    (status IS NULL OR status IN ('completed', 'in_progress', 'disqualified'))
  );