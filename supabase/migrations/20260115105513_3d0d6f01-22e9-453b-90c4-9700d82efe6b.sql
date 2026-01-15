-- Add new columns for motivation and email satisfaction
ALTER TABLE public.survey_submissions 
ADD COLUMN IF NOT EXISTS motivation text,
ADD COLUMN IF NOT EXISTS email_satisfaction text;