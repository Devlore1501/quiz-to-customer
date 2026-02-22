
-- Fix partial_submissions RLS: restrict SELECT/UPDATE to session owner via x-session-id header

DROP POLICY IF EXISTS "Allow public read by session" ON partial_submissions;
DROP POLICY IF EXISTS "Allow public updates by session" ON partial_submissions;

-- Anon can only SELECT rows matching their x-session-id header
CREATE POLICY "Allow read own session" ON partial_submissions
  FOR SELECT TO anon
  USING (session_id = coalesce(current_setting('request.headers', true)::json->>'x-session-id', ''));

-- Anon can only UPDATE rows matching their x-session-id header
CREATE POLICY "Allow update own session" ON partial_submissions
  FOR UPDATE TO anon
  USING (session_id = coalesce(current_setting('request.headers', true)::json->>'x-session-id', ''))
  WITH CHECK (session_id = coalesce(current_setting('request.headers', true)::json->>'x-session-id', ''));
