-- Defensive hardening: ensure has_role() never matches a NULL user_id.
-- Even though user_roles.user_id is NOT NULL today, this guards against
-- accidentally matching when called with NULL (e.g. anonymous auth.uid()).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id IS NOT NULL
      AND _user_id IS NOT NULL
      AND user_id = _user_id
      AND role = _role
  )
$function$;