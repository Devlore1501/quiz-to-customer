
CREATE OR REPLACE FUNCTION public.update_partial_submission(
  p_session_id uuid,
  p_session_secret text,
  p_current_step integer,
  p_current_step_name text,
  p_total_steps integer,
  p_form_data jsonb,
  p_abandoned boolean DEFAULT NULL,
  p_completed boolean DEFAULT NULL,
  p_submission_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_expected_hash text;
  v_provided_hash text;
  v_rows integer;
BEGIN
  IF p_session_id IS NULL OR p_session_secret IS NULL OR length(p_session_secret) < 16 THEN
    RETURN false;
  END IF;

  SELECT session_secret_hash INTO v_expected_hash
  FROM public.partial_submissions
  WHERE session_id = p_session_id;

  IF v_expected_hash IS NULL THEN
    RETURN false;
  END IF;

  v_provided_hash := encode(extensions.digest(p_session_secret, 'sha256'), 'hex');

  IF v_provided_hash <> v_expected_hash THEN
    RETURN false;
  END IF;

  UPDATE public.partial_submissions
  SET
    current_step      = COALESCE(p_current_step, current_step),
    current_step_name = COALESCE(p_current_step_name, current_step_name),
    total_steps       = COALESCE(p_total_steps, total_steps),
    form_data         = COALESCE(p_form_data, form_data),
    abandoned         = COALESCE(p_abandoned, abandoned),
    completed         = COALESCE(p_completed, completed),
    submission_id     = COALESCE(p_submission_id, submission_id),
    updated_at        = now()
  WHERE session_id = p_session_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.update_partial_submission(uuid, text, integer, text, integer, jsonb, boolean, boolean, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.update_partial_submission(uuid, text, integer, text, integer, jsonb, boolean, boolean, uuid) TO anon, authenticated, service_role;
