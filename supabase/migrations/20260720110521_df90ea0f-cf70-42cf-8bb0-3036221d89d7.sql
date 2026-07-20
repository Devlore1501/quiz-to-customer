
ALTER TABLE public.survey_submissions
  ADD COLUMN IF NOT EXISTS platform        text,
  ADD COLUMN IF NOT EXISTS email_tool      text,
  ADD COLUMN IF NOT EXISTS segmentation    text,
  ADD COLUMN IF NOT EXISTS email_frequency text;

ALTER TABLE public.partial_submissions
  ADD COLUMN IF NOT EXISTS partial_synced    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partial_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partial_pending
  ON public.partial_submissions (updated_at)
  WHERE completed = false AND partial_synced = false;

DROP FUNCTION IF EXISTS public.finalize_submission(
  uuid, text, text, text, text, text, text, text, text[], text,
  numeric, numeric, numeric, numeric, numeric, text, jsonb
);

CREATE OR REPLACE FUNCTION public.finalize_submission(
  p_submission_id uuid,
  p_session_id text,
  p_session_secret text,
  p_sector text,
  p_custom_sector text,
  p_monthly_revenue text,
  p_email_revenue_percentage text,
  p_list_size text,
  p_active_flows text[],
  p_motivation text,
  p_email_health_score numeric,
  p_yearly_potential numeric,
  p_current_email_revenue numeric,
  p_benchmark_email_revenue numeric,
  p_revenue_gap numeric,
  p_lead_quality text,
  p_report_data jsonb,
  p_platform text DEFAULT NULL,
  p_email_tool text DEFAULT NULL,
  p_segmentation text DEFAULT NULL,
  p_email_frequency text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_expected_hash text;
  v_provided_hash text;
  v_partial_email text;
  v_row_email text;
  v_row_status text;
  v_row_report jsonb;
  v_rows integer;
BEGIN
  IF p_submission_id IS NULL OR p_session_id IS NULL OR p_session_secret IS NULL OR length(p_session_secret) < 16 THEN
    RETURN false;
  END IF;

  SELECT session_secret_hash, form_data->>'email'
    INTO v_expected_hash, v_partial_email
  FROM public.partial_submissions
  WHERE session_id = p_session_id;

  IF v_expected_hash IS NULL THEN
    RETURN false;
  END IF;

  v_provided_hash := encode(extensions.digest(p_session_secret, 'sha256'), 'hex');
  IF v_provided_hash <> v_expected_hash THEN
    RETURN false;
  END IF;

  SELECT email, status, report_data
    INTO v_row_email, v_row_status, v_row_report
  FROM public.survey_submissions
  WHERE id = p_submission_id;

  IF v_row_email IS NULL THEN
    RETURN false;
  END IF;

  IF v_row_report IS NOT NULL OR v_row_status IS DISTINCT FROM 'in_progress' THEN
    RETURN false;
  END IF;

  IF lower(v_row_email) <> lower(coalesce(v_partial_email, '')) THEN
    RETURN false;
  END IF;

  UPDATE public.survey_submissions SET
    sector = COALESCE(p_sector, sector),
    custom_sector = p_custom_sector,
    monthly_revenue = COALESCE(p_monthly_revenue, monthly_revenue),
    email_revenue_percentage = COALESCE(p_email_revenue_percentage, email_revenue_percentage),
    list_size = COALESCE(p_list_size, list_size),
    active_flows = COALESCE(p_active_flows, active_flows),
    motivation = COALESCE(p_motivation, motivation),
    platform = COALESCE(p_platform, platform),
    email_tool = COALESCE(p_email_tool, email_tool),
    segmentation = COALESCE(p_segmentation, segmentation),
    email_frequency = COALESCE(p_email_frequency, email_frequency),
    email_health_score = p_email_health_score,
    yearly_potential = p_yearly_potential,
    current_email_revenue = p_current_email_revenue,
    benchmark_email_revenue = p_benchmark_email_revenue,
    revenue_gap = p_revenue_gap,
    lead_quality = p_lead_quality,
    status = 'completed',
    qualified = true,
    make_synced = false,
    ghl_synced = false,
    report_data = p_report_data
  WHERE id = p_submission_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    UPDATE public.partial_submissions
      SET submission_id = p_submission_id, completed = true, updated_at = now()
      WHERE session_id = p_session_id AND submission_id IS NULL;
  END IF;

  RETURN v_rows > 0;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_submission(
  uuid, text, text, text, text, text, text, text, text[], text,
  numeric, numeric, numeric, numeric, numeric, text, jsonb,
  text, text, text, text
) TO anon, authenticated;
