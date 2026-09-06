-- Phase A of the Continuous Exam Set model: school calendar foundation.
-- A date is an exam-eligible day unless it's a weekend (per school_settings'
-- weekend_days) or an explicit holiday - and either default can be overridden
-- per-date via calendar_overrides, so a school can declare a working Saturday
-- or a one-off closure without any code change.

create table public.calendar_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  day_status text not null check (day_status in ('holiday','working_day')),
  holiday_type text check (holiday_type in ('public','religious','school','weather','emergency','teacher_training','local','custom')),
  name text not null,
  notes text,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_overrides_holiday_type_matches_status check (
    (day_status = 'holiday' and holiday_type is not null) or
    (day_status = 'working_day' and holiday_type is null)
  ),
  unique(date)
);

alter table public.calendar_overrides enable row level security;

create policy calendar_overrides_select_authenticated on public.calendar_overrides
  for select to authenticated using (true);
create policy calendar_overrides_insert on public.calendar_overrides
  for insert to authenticated with check (public.can_manage_academics());
create policy calendar_overrides_update on public.calendar_overrides
  for update to authenticated using (public.can_manage_academics());
create policy calendar_overrides_delete on public.calendar_overrides
  for delete to authenticated using (public.can_manage_academics());

insert into public.school_settings(key, value)
values ('weekend_days', '0,6')
on conflict (key) do nothing;

-- 0=Sunday..6=Saturday (matches Postgres EXTRACT(DOW)), stored as a plain
-- comma-separated setting so it stays editable the same way pass_percentage
-- already is, without a dedicated column/migration for a single value.

create or replace function public.is_eligible_exam_day(p_date date)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override public.calendar_overrides%rowtype;
  v_weekend_days text;
  v_dow int;
begin
  select * into v_override from public.calendar_overrides where date = p_date;
  if found then
    return v_override.day_status = 'working_day';
  end if;
  select value into v_weekend_days from public.school_settings where key = 'weekend_days';
  v_dow := extract(dow from p_date)::int;
  return not (','||coalesce(v_weekend_days,'0,6')||',' like '%,'||v_dow||',%');
end;
$$;

create or replace function public.get_exam_day_status(p_date date)
returns table(is_eligible boolean, reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override public.calendar_overrides%rowtype;
  v_weekend_days text;
  v_dow int;
begin
  select * into v_override from public.calendar_overrides where date = p_date;
  if found then
    if v_override.day_status = 'working_day' then
      return query select true, format('Working day override: %s', v_override.name);
    else
      return query select false, format('%s (%s)', v_override.name, v_override.holiday_type);
    end if;
    return;
  end if;
  select value into v_weekend_days from public.school_settings where key = 'weekend_days';
  v_dow := extract(dow from p_date)::int;
  if (','||coalesce(v_weekend_days,'0,6')||',' like '%,'||v_dow||',%') then
    return query select false, 'Weekend'::text;
  end if;
  return query select true, 'School day'::text;
end;
$$;

create or replace function public.next_eligible_exam_day(p_from date)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_candidate date := p_from + 1;
  v_guard int := 0;
begin
  while not public.is_eligible_exam_day(v_candidate) loop
    v_candidate := v_candidate + 1;
    v_guard := v_guard + 1;
    if v_guard > 365 then
      raise exception 'No eligible exam day found within a year of %', p_from;
    end if;
  end loop;
  return v_candidate;
end;
$$;

revoke all on function public.is_eligible_exam_day(date) from public;
revoke all on function public.get_exam_day_status(date) from public;
revoke all on function public.next_eligible_exam_day(date) from public;
grant execute on function public.is_eligible_exam_day(date) to authenticated;
grant execute on function public.get_exam_day_status(date) to authenticated;
grant execute on function public.next_eligible_exam_day(date) to authenticated;
