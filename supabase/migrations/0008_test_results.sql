-- Phase 5: results. Pass/fail is computed from a configurable
-- school_settings value (pass_percentage), never hard-coded - per the
-- product spec's "do not hard-code one universal pass mark" requirement.
-- A trigger computes is_pass on every insert/update so the app never has
-- to duplicate that logic client-side.

insert into public.school_settings (key, value)
values ('pass_percentage', '33')
on conflict (key) do nothing;

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references public.schedule_items (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  marks_obtained numeric,
  total_marks numeric not null default 10,
  is_pass boolean,
  is_absent boolean not null default false,
  remarks text,
  entered_by uuid references public.profiles (user_id),
  entered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (schedule_item_id, student_id),
  check (total_marks > 0),
  check (
    marks_obtained is null
    or (marks_obtained >= 0 and marks_obtained <= total_marks)
  )
);

create index idx_test_results_schedule_item on public.test_results (schedule_item_id);
create index idx_test_results_student on public.test_results (student_id);

alter table public.test_results enable row level security;

create policy test_results_select on public.test_results
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.schedule_items si
      join public.teacher_subjects ts on ts.subject_id = si.subject_id
      where si.id = test_results.schedule_item_id and ts.teacher_id = auth.uid()
    )
  );

create policy test_results_write on public.test_results
  for all using (
    public.is_owner()
    or exists (
      select 1 from public.schedule_items si
      join public.teacher_subjects ts on ts.subject_id = si.subject_id
      where si.id = test_results.schedule_item_id and ts.teacher_id = auth.uid()
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1 from public.schedule_items si
      join public.teacher_subjects ts on ts.subject_id = si.subject_id
      where si.id = test_results.schedule_item_id and ts.teacher_id = auth.uid()
    )
  );

create or replace function public.compute_test_result_pass_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pass_pct numeric;
begin
  new.updated_at := now();

  if new.is_absent then
    new.is_pass := false;
    new.marks_obtained := null;
    return new;
  end if;

  if new.marks_obtained is null then
    new.is_pass := null;
    return new;
  end if;

  select coalesce(
    (select value::numeric from public.school_settings where key = 'pass_percentage'),
    33
  ) into pass_pct;

  new.is_pass := (new.marks_obtained / new.total_marks) * 100 >= pass_pct;
  return new;
end;
$$;

create trigger trg_compute_test_result_pass_status
before insert or update on public.test_results
for each row execute function public.compute_test_result_pass_status();

revoke execute on function public.compute_test_result_pass_status() from public;
revoke execute on function public.compute_test_result_pass_status() from anon;
revoke execute on function public.compute_test_result_pass_status() from authenticated;
