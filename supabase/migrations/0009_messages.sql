-- Phase 8: messaging. Owner <-> any staff member (1:1), and a broadcast is
-- a fan-out of individual messages sharing one broadcast_id (so each
-- recipient replies in their own private thread with the owner - other
-- recipients never see it). A teacher may only message the owner, never
-- another teacher, to keep this a staff<->owner channel, not a chat app.
--
-- thread_key is a generated, order-independent pairing of the two users'
-- ids, so "the conversation between A and B" is a single stable key
-- regardless of who sent which message - no separate threads table
-- needed for a purely 1:1 messaging model.
--
-- Messages are immutable once sent, except read_at - enforced by trigger,
-- same pattern as the profiles/exam_papers privilege guards.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (user_id) on delete cascade,
  recipient_id uuid not null references public.profiles (user_id) on delete cascade,
  thread_key text generated always as (
    case
      when sender_id < recipient_id then sender_id::text || ':' || recipient_id::text
      else recipient_id::text || ':' || sender_id::text
    end
  ) stored,
  broadcast_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  check (length(btrim(body)) > 0)
);

create index idx_messages_thread_key on public.messages (thread_key, created_at);
create index idx_messages_recipient_unread on public.messages (recipient_id, read_at);
create index idx_messages_broadcast on public.messages (broadcast_id) where broadcast_id is not null;

alter table public.messages enable row level security;

create policy messages_select on public.messages
  for select using (
    public.is_owner() or sender_id = auth.uid() or recipient_id = auth.uid()
  );

-- A teacher may only message the owner; the owner may message anyone.
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_owner()
      or exists (
        select 1 from public.profiles p
        where p.user_id = recipient_id and p.role = 'owner'
      )
    )
  );

-- Only the recipient (or owner, for oversight) may touch a message row,
-- and only to mark it read - enforced by the trigger below.
create policy messages_update_read_status on public.messages
  for update using (recipient_id = auth.uid() or public.is_owner())
  with check (recipient_id = auth.uid() or public.is_owner());

create or replace function public.enforce_message_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.broadcast_id is distinct from old.broadcast_id
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at then
    raise exception 'Messages are immutable except for read_at.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_message_immutability
before update on public.messages
for each row execute function public.enforce_message_immutability();

revoke execute on function public.enforce_message_immutability() from public;
revoke execute on function public.enforce_message_immutability() from anon;
revoke execute on function public.enforce_message_immutability() from authenticated;
