-- Found via live testing: messages_insert's "is the recipient an owner/
-- teacher" checks were raw cross-table subqueries against `profiles`
-- embedded directly in the policy - which are themselves subject to
-- profiles' OWN row-level security, evaluated as the SENDER's session, not
-- bypassed the way is_owner() bypasses it via SECURITY DEFINER. A teacher
-- cannot see the owner's profile row through profiles_select, so the
-- "recipient is owner" exists() check silently returned false and rejected
-- every teacher-to-owner message - this predates Phase A entirely; it was
-- apparently never live-tested with a real non-owner INSERT before now.
--
-- Fix: a SECURITY DEFINER helper that checks a target user's role directly,
-- bypassing profiles RLS the same way is_owner() does - then use it in place
-- of every raw profiles subquery in messages_insert.
create function public.user_has_role(target_user_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = target_user_id and role = target_role and is_active = true
  );
$$;

revoke execute on function public.user_has_role(uuid, text) from public, anon;
grant execute on function public.user_has_role(uuid, text) to authenticated;

alter policy messages_insert on public.messages
  with check (
    (sender_id = (select auth.uid()))
    and (
      is_owner()
      or public.user_has_role(recipient_id, 'owner')
      or (can_manage_academics() and public.user_has_role(recipient_id, 'teacher'))
    )
  );
