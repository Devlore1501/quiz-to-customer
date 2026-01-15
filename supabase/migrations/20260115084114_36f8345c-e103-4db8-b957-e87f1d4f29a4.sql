-- Add rate limiting function for survey submissions
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  submission_count INTEGER;
BEGIN
  -- Count submissions from the same email in the last hour
  SELECT COUNT(*) INTO submission_count
  FROM public.survey_submissions
  WHERE email = NEW.email
    AND created_at > now() - INTERVAL '1 hour';
  
  -- Allow max 3 submissions per email per hour
  IF submission_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 3 submissions per hour per email address';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce rate limiting on insert
CREATE TRIGGER enforce_submission_rate_limit
  BEFORE INSERT ON public.survey_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_submission_rate_limit();

-- Add email format validation constraint
ALTER TABLE public.survey_submissions
ADD CONSTRAINT email_format_check
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add size limit constraint for report_data to prevent storage abuse
-- Limit to 1MB (1048576 bytes)
ALTER TABLE public.survey_submissions
ADD CONSTRAINT report_data_size_limit
CHECK (report_data IS NULL OR pg_column_size(report_data) < 1048576);