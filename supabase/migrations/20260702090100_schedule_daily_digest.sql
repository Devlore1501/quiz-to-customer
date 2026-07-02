-- Schedule the morning news digest via pg_cron + pg_net
-- pg_net is already enabled (see 20260422220351). pg_cron runs in UTC:
-- '0 5 * * *' = 07:00 Europe/Rome in summer (CEST), 06:00 in winter (accepted drift).
--
-- NOTE: the Authorization header reads current_setting('app.settings.service_role_key').
-- Until that setting is configured once via:
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
-- the cron call fails safely with a 401 from the edge function.

CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO postgres;

DO $$
DECLARE
  job_id BIGINT;
BEGIN
  FOR job_id IN SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-digest' LOOP
    PERFORM cron.unschedule(job_id);
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'generate-daily-digest',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vsvffgngmzgpgvzwkdwr.supabase.co/functions/v1/generate-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('trigger', 'cron'),
    timeout_milliseconds := 5000
  );
  $$
);
