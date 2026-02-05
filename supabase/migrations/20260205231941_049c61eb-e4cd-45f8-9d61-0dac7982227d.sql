ALTER TABLE survey_submissions ALTER COLUMN company_name DROP NOT NULL;
ALTER TABLE survey_submissions ALTER COLUMN company_name SET DEFAULT '';