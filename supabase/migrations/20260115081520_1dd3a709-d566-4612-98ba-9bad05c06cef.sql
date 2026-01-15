-- Add columns to track lead status and qualification
ALTER TABLE public.survey_submissions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS disqualification_reason TEXT;

-- Make previously required fields nullable for partial submissions
ALTER TABLE public.survey_submissions 
ALTER COLUMN sector DROP NOT NULL,
ALTER COLUMN monthly_revenue DROP NOT NULL,
ALTER COLUMN email_revenue_percentage DROP NOT NULL,
ALTER COLUMN list_size DROP NOT NULL;