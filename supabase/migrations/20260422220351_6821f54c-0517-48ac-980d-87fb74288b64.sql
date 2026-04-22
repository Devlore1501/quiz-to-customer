-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: invokes the submit-webhook edge function when a submission has report_data
CREATE OR REPLACE FUNCTION public.trigger_submit_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text := 'https://vsvffgngmzgpgvzwkdwr.supabase.co/functions/v1/submit-webhook';
  service_key text;
  payload jsonb;
  report_url text;
BEGIN
  -- Fire only when report_data transitions from NULL -> NOT NULL
  -- and the submission has not been synced yet
  IF NEW.report_data IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.report_data IS NOT NULL THEN
    -- Already had report_data; nothing new to send
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.make_synced, false) = true AND COALESCE(NEW.ghl_synced, false) = true THEN
    RETURN NEW;
  END IF;

  -- Get service role key from vault if available, otherwise use anon (edge function uses verify_jwt=false)
  service_key := current_setting('app.settings.service_role_key', true);

  report_url := 'https://quiz-to-customer.lovable.app/report/' || NEW.id::text;

  -- Build the payload exactly like the client does:
  -- Wrap report_data and add submissionId for the edge function verification
  payload := jsonb_build_object(
    'submissionData', COALESCE(NEW.report_data, '{}'::jsonb) || jsonb_build_object('reportUrl', report_url),
    'submissionId', NEW.id::text
  );

  -- Fire-and-forget async HTTP call via pg_net
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Origin', 'https://quiz-to-customer.lovable.app'
    ),
    body := payload,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail the underlying insert/update because of webhook delivery
  RAISE WARNING 'trigger_submit_webhook error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS submit_webhook_on_report_ready ON public.survey_submissions;

-- Trigger fires on INSERT (when row is created with report_data)
-- and on UPDATE (when report_data is set later)
CREATE TRIGGER submit_webhook_on_report_ready
AFTER INSERT OR UPDATE OF report_data ON public.survey_submissions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_submit_webhook();