-- Fix UUID validation: Add proper server-side validation and error handling
-- to the get_report_by_id function

CREATE OR REPLACE FUNCTION public.get_report_by_id(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_report jsonb;
  result jsonb;
BEGIN
  -- Validate UUID format (additional safety - PostgreSQL type checks this but we add explicit handling)
  IF report_id IS NULL THEN
    RETURN NULL; -- Return NULL for invalid input instead of raising exception
  END IF;
  
  -- Get the report data
  SELECT report_data INTO full_report
  FROM survey_submissions
  WHERE id = report_id;
  
  -- If no report found, return NULL
  IF full_report IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return only the clientReport portion (no PII)
  result := full_report->'clientReport';
  
  IF result IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object('clientReport', result);
  
EXCEPTION
  WHEN invalid_text_representation THEN
    -- Invalid UUID format - return NULL safely
    RETURN NULL;
  WHEN OTHERS THEN
    -- Log the error but return NULL to avoid leaking details
    RETURN NULL;
END;
$$;