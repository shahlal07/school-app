-- Most teachers at this school have no email address. Supabase Auth still
-- requires an email-shaped identity internally, so a username-based
-- account uses a deterministic synthetic email
-- ("<username>@teacher.schoolos.local", never delivered anywhere) that the
-- app computes on the fly at both account-creation and sign-in time - no
-- separate email column needed, no lookup required before sign-in.
--
-- profiles.username is the human-facing identifier the owner sets and the
-- teacher actually types to log in. Case-insensitive uniqueness (two
-- teachers can't collide on "Ahmed" vs "ahmed").

alter table public.profiles add column username text;

create unique index uq_profiles_username_lower on public.profiles (lower(username)) where username is not null;
