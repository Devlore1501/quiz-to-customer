
-- Update get_report_by_id to also return meta alongside clientReport
CREATE OR REPLACE FUNCTION public.get_report_by_id(report_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  full_report jsonb;
  client_report jsonb;
  meta jsonb;
BEGIN
  IF report_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT report_data INTO full_report
  FROM survey_submissions
  WHERE id = report_id;
  
  IF full_report IS NULL THEN
    RETURN NULL;
  END IF;
  
  client_report := full_report->'clientReport';
  
  IF client_report IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract meta if present (optional, retrocompatible)
  meta := full_report->'meta';
  
  -- Return clientReport + meta (meta may be null for old records)
  RETURN jsonb_build_object(
    'clientReport', client_report,
    'meta', meta
  );
  
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
