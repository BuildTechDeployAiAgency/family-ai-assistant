-- Harden per security advisors (migration 0001).
-- 1. auth_family_id is only meant to be called inside RLS policies (owner context),
--    not directly via PostgREST RPC. Revoke EXECUTE from API roles.
revoke execute on function public.auth_family_id() from public, anon, authenticated;

-- 2. Keep the vector extension out of the public schema.
alter extension vector set schema extensions;
