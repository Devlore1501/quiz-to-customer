
CREATE TABLE public.landing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'cta_click')),
  survey_type TEXT NOT NULL DEFAULT 'email_marketing',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_events_created_at ON public.landing_events (created_at DESC);
CREATE INDEX idx_landing_events_session_event ON public.landing_events (session_key, event_type);
CREATE INDEX idx_landing_events_survey_type ON public.landing_events (survey_type);

GRANT INSERT ON public.landing_events TO anon, authenticated;
GRANT SELECT ON public.landing_events TO authenticated;
GRANT ALL ON public.landing_events TO service_role;

ALTER TABLE public.landing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert landing events"
  ON public.landing_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read landing events"
  ON public.landing_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
