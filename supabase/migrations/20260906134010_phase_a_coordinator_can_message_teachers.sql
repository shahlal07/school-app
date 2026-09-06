-- The owner asked for full messaging parity: academic_coordinator should be
-- able to message any teacher and broadcast to all teachers, the same as
-- owner already can - not just a single fixed thread up to the owner.
-- Additive: the existing is_owner() and "recipient is owner" clauses are
-- preserved verbatim, so every other role's messaging behavior (teacher,
-- principal, clerk messaging the owner) is unchanged.
alter policy messages_insert on public.messages
  with check (
    (sender_id = (select auth.uid()))
    and (
      is_owner()
      or exists (select 1 from public.profiles p where p.user_id = messages.recipient_id and p.role = 'owner')
      or (can_manage_academics() and exists (select 1 from public.profiles p where p.user_id = messages.recipient_id and p.role = 'teacher'))
    )
  );
