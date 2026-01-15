-- Fix the get_report_by_id function to return ONLY the clientReport portion
-- without the quickSummary which contains PII (name, email, phone, website)

CREATE OR REPLACE FUNCTION public.get_report_by_id(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  full_report jsonb;
BEGIN
  -- Get the full report_data
  SELECT report_data INTO full_report
  FROM survey_submissions
  WHERE id = report_id;
  
  -- Return NULL if no report found
  IF full_report IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return only the clientReport portion (no PII)
  -- This removes quickSummary which contains: leadName, leadEmail, leadPhone, website
  result := jsonb_build_object('clientReport', full_report->'clientReport');
  
  RETURN result;
END;
$$;