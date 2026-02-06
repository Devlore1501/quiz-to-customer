CREATE POLICY "Allow public read by session"
  ON public.partial_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);