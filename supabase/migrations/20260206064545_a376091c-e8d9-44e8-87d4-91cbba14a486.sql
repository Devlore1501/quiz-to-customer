
CREATE TABLE public.partial_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  survey_type text NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  current_step_name text,
  total_steps integer NOT NULL,
  form_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  abandoned boolean NOT NULL DEFAULT false,
  submission_id uuid REFERENCES public.survey_submissions(id)
);

ALTER TABLE public.partial_submissions ENABLE ROW LEVEL SECURITY;

-- Public INSERT (unauthenticated users)
CREATE POLICY "Allow public inserts" ON public.partial_submissions
  FOR INSERT WITH CHECK (true);

-- Public UPDATE (unauthenticated users can update their own session)
CREATE POLICY "Allow public updates by session" ON public.partial_submissions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Admin SELECT
CREATE POLICY "Admin read access" ON public.partial_submissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE
CREATE POLICY "Admin delete access" ON public.partial_submissions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_partial_submissions_session ON public.partial_submissions(session_id);
CREATE INDEX idx_partial_submissions_abandoned ON public.partial_submissions(abandoned) WHERE abandoned = true AND completed = false;
CREATE INDEX idx_partial_submissions_created ON public.partial_submissions(started_at);
