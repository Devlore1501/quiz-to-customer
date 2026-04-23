-- Add session_secret_hash column for secure ownership validation on partial_submissions.
-- The client generates a random secret, sends only its SHA-256 hash on INSERT,
-- and proves ownership on UPDATE by sending the plaintext secret in 'x-session-secret' header.

ALTER TABLE public.partial_submissions
  ADD COLUMN IF NOT EXISTS session_secret_hash text;

-- Helper: extract and hash the x-session-secret header (hex SHA-256), returns null if missing.
CREATE OR REPLACE FUNCTION public.current_session_secret_hash()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN COALESCE(((current_setting('request.headers', true))::json ->> 'x-session-secret'), '') = ''
      THEN NULL
    ELSE encode(
      extensions.digest(
        ((current_setting('request.headers', true))::json ->> 'x-session-secret'),
        'sha256'
      ),
      'hex'
    )
  END
$$;

-- Drop the spoofable session-id-header policy.
DROP POLICY IF EXISTS "Allow update own session" ON public.partial_submissions;

-- New UPDATE policy: ownership proven by the plaintext secret hashing to the stored hash.
CREATE POLICY "Allow update own session via secret"
ON public.partial_submissions
FOR UPDATE
TO anon
USING (
  session_secret_hash IS NOT NULL
  AND session_secret_hash = public.current_session_secret_hash()
)
WITH CHECK (
  session_secret_hash IS NOT NULL
  AND session_secret_hash = public.current_session_secret_hash()
);

-- Tighten INSERT policy: require session_secret_hash to be present (64-char hex SHA-256).
DROP POLICY IF EXISTS "Allow public inserts" ON public.partial_submissions;

CREATE POLICY "Allow public inserts"
ON public.partial_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    session_id IS NOT NULL
    AND length(session_id) >= 16
    AND session_secret_hash IS NOT NULL
    AND length(session_secret_hash) = 64
    AND completed = false
    AND abandoned = false
    AND submission_id IS NULL
    AND survey_type = ANY (ARRAY['email_marketing'::text, 'conversational'::text])
  )
);

-- Protect session_secret_hash from being changed after creation by anon updates.
CREATE OR REPLACE FUNCTION public.protect_partial_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION 'session_id is immutable';
  END IF;
  IF NEW.survey_type IS DISTINCT FROM OLD.survey_type THEN
    RAISE EXCEPTION 'survey_type is immutable';
  END IF;
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'started_at is immutable';
  END IF;
  IF NEW.session_secret_hash IS DISTINCT FROM OLD.session_secret_hash THEN
    RAISE EXCEPTION 'session_secret_hash is immutable';
  END IF;
  IF NEW.submission_id IS DISTINCT FROM OLD.submission_id
     AND OLD.submission_id IS NOT NULL THEN
    RAISE EXCEPTION 'submission_id can only be set once';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists (idempotent).
DROP TRIGGER IF EXISTS protect_partial_submission_fields_trg ON public.partial_submissions;
CREATE TRIGGER protect_partial_submission_fields_trg
BEFORE UPDATE ON public.partial_submissions
FOR EACH ROW
EXECUTE FUNCTION public.protect_partial_submission_fields();