-- Add lead enrichment tracking columns to survey_submissions
ALTER TABLE survey_submissions
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT CHECK (enrichment_status IN ('processing', 'completed', 'failed')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_completed_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_survey_submissions_enrichment_status
  ON survey_submissions (enrichment_status);
