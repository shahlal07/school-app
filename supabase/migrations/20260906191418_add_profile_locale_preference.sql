-- App-wide English/Urdu language system: persists per-user language choice
-- so it survives across sessions/devices, per the product spec's preferred
-- persistence order (profile > cookie fallback > default 'en').
alter table public.profiles add column locale text not null default 'en' check (locale in ('en','ur'));

create or replace function public.set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;
  if p_locale not in ('en','ur') then
    raise exception 'Invalid locale.';
  end if;
  update public.profiles set locale = p_locale where user_id = auth.uid();
end;
$$;

revoke all on function public.set_my_locale(text) from public, anon;
grant execute on function public.set_my_locale(text) to authenticated;
