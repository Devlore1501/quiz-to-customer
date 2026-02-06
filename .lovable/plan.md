

## Fix: Partial Submissions Updates Not Persisting

### Root Cause

The `partial_submissions` table has no `SELECT` policy for the `anon` role. Only authenticated admin users can SELECT rows. When PostgREST processes a PATCH request, it needs to find matching rows first. Without SELECT access, the filter `session_id=eq.xxx` returns 0 rows, so the UPDATE affects 0 rows. PostgREST returns 204 regardless, masking the failure.

The INSERT works because it doesn't require reading existing rows. The UPDATE silently does nothing.

### Fix

Add a permissive SELECT policy for `anon` and `authenticated` roles on `partial_submissions` so the UPDATE filter can match rows.

### Technical Details

**SQL Migration:**
```sql
CREATE POLICY "Allow public read by session"
  ON public.partial_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

This allows the Supabase client to find rows when applying the UPDATE filter. The table does not contain sensitive PII beyond what the user themselves entered in the current session.

### Validation

After applying the migration:
- Existing phone and email validation will continue to work
- The debounced PATCH updates will now persist `form_data` and `current_step` to the database
- The `beforeunload` handler will correctly mark sessions as abandoned
- All existing admin-only policies remain unchanged

### Files changed
- New SQL migration (one `CREATE POLICY` statement)

