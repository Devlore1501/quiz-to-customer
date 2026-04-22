-- Tighten the always-true anon INSERT policy on partial_submissions.
DROP POLICY IF EXISTS "Allow public inserts" ON public.partial_submissions;

CREATE POLICY "Allow public inserts"
ON public.partial_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Caller must declare a non-empty session id (the bearer token).
    session_id IS NOT NULL
    AND length(session_id) >= 16
    -- New rows must start in a clean state.
    AND completed = false
    AND abandoned = false
    AND submission_id IS NULL
    -- Survey type must be one of the known values.
    AND survey_type = ANY (ARRAY['email_marketing', 'conversational'])
  )
);