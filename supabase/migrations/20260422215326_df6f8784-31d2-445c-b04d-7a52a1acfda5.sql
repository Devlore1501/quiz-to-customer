-- 1. Remove the spoofable anon SELECT policy on partial_submissions.
-- The quiz hook only writes (INSERT/PATCH) and never reads partials back
-- in the browser, so there is no need for anon SELECT access. Admins keep
-- their existing read policy.
DROP POLICY IF EXISTS "Allow read own session" ON public.partial_submissions;

-- 2. Tighten the anon UPDATE policy on partial_submissions.
-- Keep the session-id check (still required for the in-flight quiz to update
-- its own row), but additionally forbid changing the submission linkage,
-- survey type, started_at and session_id itself via anon updates.
DROP POLICY IF EXISTS "Allow update own session" ON public.partial_submissions;

CREATE POLICY "Allow update own session"
ON public.partial_submissions
FOR UPDATE
TO anon
USING (
  session_id = COALESCE(
    ((current_setting('request.headers', true))::json ->> 'x-session-id'),
    ''
  )
)
WITH CHECK (
  session_id = COALESCE(
    ((current_setting('request.headers', true))::json ->> 'x-session-id'),
    ''
  )
);

-- Add a trigger to prevent anon updates from changing immutable / trusted
-- fields on partial_submissions, regardless of what RLS allows.
CREATE OR REPLACE FUNCTION public.protect_partial_submission_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins (authenticated) can change anything.
  IF auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- For anon updates, lock down identity / linkage fields.
  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION 'session_id is immutable';
  END IF;
  IF NEW.survey_type IS DISTINCT FROM OLD.survey_type THEN
    RAISE EXCEPTION 'survey_type is immutable';
  END IF;
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'started_at is immutable';
  END IF;
  IF NEW.submission_id IS DISTINCT FROM OLD.submission_id
     AND OLD.submission_id IS NOT NULL THEN
    RAISE EXCEPTION 'submission_id can only be set once';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partial_submission_fields_trg ON public.partial_submissions;
CREATE TRIGGER protect_partial_submission_fields_trg
BEFORE UPDATE ON public.partial_submissions
FOR EACH ROW
EXECUTE FUNCTION public.protect_partial_submission_fields();

-- 3. Tighten anon INSERT on survey_submissions.
-- Currently anon clients can populate ANY column, including trusted ones
-- like qualified, lead_quality, report_data, email_health_score,
-- make_synced, ghl_synced, disqualification_reason, revenue_gap,
-- yearly_potential, current_email_revenue, benchmark_email_revenue.
-- Force these to their server-side defaults (or NULL) for non-admin inserts.
DROP POLICY IF EXISTS "Allow public inserts" ON public.survey_submissions;

CREATE POLICY "Allow public inserts"
ON public.survey_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Admins can insert anything.
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Status must be one of the allowed values (or null -> default).
    (status IS NULL OR status = ANY (ARRAY['completed', 'in_progress', 'disqualified']))
    -- Trusted / computed fields must NOT be set by anonymous clients.
    -- They will be populated server-side (edge functions, admin UI, triggers).
    AND qualified IS NULL
    AND lead_quality IS NULL
    AND report_data IS NULL
    AND email_health_score IS NULL
    AND yearly_potential IS NULL
    AND current_email_revenue IS NULL
    AND benchmark_email_revenue IS NULL
    AND revenue_gap IS NULL
    AND disqualification_reason IS NULL
    AND (make_synced IS NULL OR make_synced = false)
    AND (ghl_synced IS NULL OR ghl_synced = false)
  )
);