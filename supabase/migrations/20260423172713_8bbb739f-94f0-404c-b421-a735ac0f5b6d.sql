-- Explicit restrictive UPDATE policy on user_roles: deny all updates, no exceptions.
-- RESTRICTIVE policies are AND-combined with permissive ones, so even if a future
-- permissive UPDATE policy is added by mistake, this WITH CHECK (false) blocks it.
DROP POLICY IF EXISTS "No one can update roles" ON public.user_roles;

CREATE POLICY "No one can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);