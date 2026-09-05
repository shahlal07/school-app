-- Security advisor flagged both SECURITY DEFINER functions as publicly
-- callable via PostgREST RPC (/rest/v1/rpc/...) by default. Neither is
-- meant to be a public API endpoint:
--   - is_owner() is only meant to be evaluated inside RLS policies, which
--     requires EXECUTE for 'authenticated' (the role RLS runs as for
--     logged-in requests) but never for anonymous requests.
--   - prevent_profile_privilege_escalation() is a trigger function only;
--     triggers do not need EXECUTE granted to any role to fire.
--
-- Residual advisor warning (accepted): is_owner() remains callable by
-- 'authenticated' via RPC, because RLS policy evaluation itself requires
-- that grant. This is safe: the function only reports the calling user's
-- own role back to them and touches no other user's data.

revoke execute on function public.is_owner() from public;
revoke execute on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;

revoke execute on function public.prevent_profile_privilege_escalation() from public;
revoke execute on function public.prevent_profile_privilege_escalation() from anon;
revoke execute on function public.prevent_profile_privilege_escalation() from authenticated;
