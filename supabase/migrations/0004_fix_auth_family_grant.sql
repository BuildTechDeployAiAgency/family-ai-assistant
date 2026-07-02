-- 0002 over-revoked: RLS policies call auth_family_id() as the querying role,
-- so `authenticated` MUST keep EXECUTE or every policy returns no rows
-- (symptom: api returns "No family for this user" for a valid session).
-- Safe: the function is SECURITY DEFINER and returns only the caller's own family_id.
grant execute on function public.auth_family_id() to authenticated;
