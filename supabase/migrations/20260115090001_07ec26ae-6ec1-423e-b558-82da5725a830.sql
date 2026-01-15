-- Drop overly permissive public read policy
DROP POLICY IF EXISTS "Allow public read by id" ON public.survey_submissions;

-- Create secure function that only returns report_data (not PII)
CREATE OR REPLACE FUNCTION public.get_report_by_id(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT report_data INTO result
  FROM survey_submissions
  WHERE id = report_id;
  RETURN result;
END;
$$;