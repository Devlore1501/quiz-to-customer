-- Create survey_submissions table
CREATE TABLE public.survey_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contact data
  company_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  
  -- Survey data
  sector TEXT NOT NULL,
  custom_sector TEXT,
  monthly_revenue TEXT NOT NULL,
  email_revenue_percentage TEXT NOT NULL,
  list_size TEXT NOT NULL,
  active_flows TEXT[] DEFAULT '{}',
  
  -- Calculated results
  email_health_score INTEGER,
  yearly_potential NUMERIC,
  current_email_revenue NUMERIC,
  benchmark_email_revenue NUMERIC,
  revenue_gap NUMERIC,
  lead_quality TEXT,
  
  -- Webhook sync flags
  make_synced BOOLEAN DEFAULT false,
  ghl_synced BOOLEAN DEFAULT false,
  
  -- Raw report data (for reference)
  report_data JSONB
);

-- Enable RLS
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (public form)
CREATE POLICY "Allow public inserts"
ON public.survey_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated inserts
CREATE POLICY "Allow authenticated inserts"
ON public.survey_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for common queries
CREATE INDEX idx_survey_submissions_created_at ON public.survey_submissions(created_at DESC);
CREATE INDEX idx_survey_submissions_email ON public.survey_submissions(email);
CREATE INDEX idx_survey_submissions_sector ON public.survey_submissions(sector);