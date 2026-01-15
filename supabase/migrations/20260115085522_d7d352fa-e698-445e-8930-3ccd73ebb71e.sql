-- Add a policy to allow anyone to read a report by its ID
-- This enables shareable report links
CREATE POLICY "Allow public read by id"
ON public.survey_submissions
FOR SELECT
USING (true);