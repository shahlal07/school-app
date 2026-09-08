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

create or replace function public.user_is_active(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = target_user_id and is_active = true
  );
$$;

revoke execute on function public.user_is_active(uuid) from public, anon;
grant execute on function public.user_is_active(uuid) to authenticated;

-- Any authenticated School OS staff account can send to any other active
-- School OS staff account. Message contents remain protected by messages_select.
alter policy messages_insert on public.messages
  with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and public.user_is_active(recipient_id)
  );
