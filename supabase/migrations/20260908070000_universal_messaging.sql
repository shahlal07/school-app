-- Universal School OS messaging:
-- every active staff role can message every other active staff role.
-- Keep profile privacy intact by exposing only safe messaging directory fields.

create or replace function public.list_messageable_profiles()
returns table (
  user_id uuid,
  full_name text,
  role text,
  username text,
  designation text,
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.full_name, p.role, p.username, p.designation, p.is_active
  from public.profiles p
  where p.is_active = true
  order by lower(p.full_name);
$$;

revoke execute on function public.list_messageable_profiles() from public, anon;
grant execute on function public.list_messageable_profiles() to authenticated;

-- The recipient must be a real active School OS account, regardless of role.
alter policy messages_insert on public.messages
  with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and public.user_has_role(recipient_id, 'owner')
      or (
        sender_id = (select auth.uid())
        and sender_id <> recipient_id
        and exists (
          select 1
          from public.profiles p
          where p.user_id = recipient_id
            and p.is_active = true
        )
      )
  );

-- The expression above intentionally allows any active role, but the first
-- branch is retained for compatibility with earlier policy semantics.
-- Normalize it into one explicit, role-independent predicate.
alter policy messages_insert on public.messages
  with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and exists (
      select 1
      from public.profiles p
      where p.user_id = recipient_id
        and p.is_active = true
    )
  );
