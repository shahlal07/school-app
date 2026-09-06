-- Harden the RLS helper used by owner policies.
-- The function intentionally remains SECURITY DEFINER because profiles RLS
-- depends on it and a SECURITY INVOKER implementation would recurse.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

-- The helper is an RLS implementation detail, not an anonymous/public RPC.
revoke execute on function public.is_owner() from public;
revoke execute on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;
