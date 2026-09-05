-- Phase 6: automated compliance alert engine.
--
-- alerts is an append-mostly table: a scan function (scheduled via
-- pg_cron, free on Supabase - it runs inside the Postgres instance
-- itself, not a separate billed service) finds compliance gaps and
-- inserts rows, deduplicated by a partial unique index so re-running the
-- scan never creates a second open alert for the same condition. Owner
-- sees every alert; a teacher sees only their own.

create extension if not exists pg_cron;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (
    type in (
      'paper_missing', 'paper_deadline_approaching', 'paper_rejected',
      'test_overdue', 'test_not_conducted', 'results_missing',
      'results_overdue', 'syllabus_behind', 'teacher_compliance_warning',
      'student_performance_warning', 'class_performance_warning',
      'subject_performance_warning'
    )
  ),
  severity text not null default 'warning' check (
    severity in ('info', 'warning', 'urgent', 'critical')
  ),
  teacher_id uuid references public.profiles (user_id) on delete cascade,
  reference_table text not null,
  reference_id uuid not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (user_id)
);

-- Only one OPEN alert per (type, reference_id) at a time - the scan
-- function relies on this for its ON CONFLICT DO NOTHING dedup.
create unique index uq_alerts_open_dedup on public.alerts (type, reference_id) where status = 'open';
create index idx_alerts_teacher on public.alerts (teacher_id);
create index idx_alerts_status on public.alerts (status);

alter table public.alerts enable row level security;

create policy alerts_select on public.alerts
  for select using (public.is_owner() or teacher_id = auth.uid());

-- Only the owner resolves alerts by hand; the scan function itself runs
-- as postgres (via pg_cron), which bypasses RLS entirely, so it needs no
-- insert policy for itself.
create policy alerts_update_owner_only on public.alerts
  for update using (public.is_owner()) with check (public.is_owner());

create policy alerts_delete_owner_only on public.alerts
  for delete using (public.is_owner());

-- ---------------------------------------------------------------------
-- The scan function itself.
-- ---------------------------------------------------------------------

create or replace function public.scan_examination_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- paper_missing: a test is within 2 days (or already past) and no
  -- exam_papers row exists yet, or one exists but is still
  -- not_started/draft (never actually submitted).
  insert into public.alerts (type, severity, teacher_id, reference_table, reference_id, message)
  select
    'paper_missing',
    case when si.scheduled_date < current_date then 'urgent' else 'warning' end,
    ts.teacher_id,
    'schedule_items',
    si.id,
    format(
      'Paper for "%s" (scheduled %s) has not been submitted.',
      si.title, to_char(si.scheduled_date, 'DD Mon YYYY')
    )
  from public.schedule_items si
  join public.teacher_subjects ts on ts.subject_id = si.subject_id
  left join public.exam_papers ep on ep.schedule_item_id = si.id
  where si.status not in ('cancelled', 'skipped', 'completed')
    and si.scheduled_date <= current_date + interval '2 days'
    and (ep.id is null or ep.status in ('not_started', 'draft'))
  on conflict (type, reference_id) where status = 'open' do nothing;

  -- test_overdue: the scheduled date has passed and the item was never
  -- marked completed/cancelled/skipped.
  insert into public.alerts (type, severity, teacher_id, reference_table, reference_id, message)
  select
    'test_overdue',
    'urgent',
    ts.teacher_id,
    'schedule_items',
    si.id,
    format(
      '"%s" was scheduled for %s and is still marked %s.',
      si.title, to_char(si.scheduled_date, 'DD Mon YYYY'), si.status
    )
  from public.schedule_items si
  join public.teacher_subjects ts on ts.subject_id = si.subject_id
  where si.status not in ('completed', 'cancelled', 'skipped')
    and si.scheduled_date < current_date
  on conflict (type, reference_id) where status = 'open' do nothing;

  -- results_missing: the test is marked completed but no test_results
  -- rows exist for it at all.
  insert into public.alerts (type, severity, teacher_id, reference_table, reference_id, message)
  select
    'results_missing',
    'warning',
    ts.teacher_id,
    'schedule_items',
    si.id,
    format('Results for "%s" have not been entered yet.', si.title)
  from public.schedule_items si
  join public.teacher_subjects ts on ts.subject_id = si.subject_id
  where si.status = 'completed'
    and not exists (
      select 1 from public.test_results tr where tr.schedule_item_id = si.id
    )
  on conflict (type, reference_id) where status = 'open' do nothing;

  -- Auto-resolve: if a paper_missing alert's underlying condition is no
  -- longer true (a paper has since been submitted), close it out rather
  -- than leaving a stale open alert forever.
  update public.alerts a
  set status = 'resolved', resolved_at = now()
  where a.type = 'paper_missing'
    and a.status = 'open'
    and exists (
      select 1 from public.exam_papers ep
      where ep.schedule_item_id = a.reference_id
        and ep.status not in ('not_started', 'draft')
    );

  update public.alerts a
  set status = 'resolved', resolved_at = now()
  where a.type = 'test_overdue'
    and a.status = 'open'
    and exists (
      select 1 from public.schedule_items si
      where si.id = a.reference_id and si.status in ('completed', 'cancelled', 'skipped')
    );

  update public.alerts a
  set status = 'resolved', resolved_at = now()
  where a.type = 'results_missing'
    and a.status = 'open'
    and exists (
      select 1 from public.test_results tr where tr.schedule_item_id = a.reference_id
    );
end;
$$;

revoke execute on function public.scan_examination_compliance() from public;
revoke execute on function public.scan_examination_compliance() from anon;
revoke execute on function public.scan_examination_compliance() from authenticated;

-- Run every hour. pg_cron jobs execute as the role that scheduled them
-- (postgres here), which bypasses RLS - correct, since this function
-- must be able to insert alerts on behalf of any teacher.
select cron.schedule(
  'scan-examination-compliance',
  '0 * * * *',
  $$select public.scan_examination_compliance();$$
);
