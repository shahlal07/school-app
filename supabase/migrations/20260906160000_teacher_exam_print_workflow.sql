-- Teacher paper upload -> clerk print queue -> printed notification workflow.
-- Reuses exam_papers + the existing alerts system; print jobs provide a durable audit trail.

alter table public.alerts add column if not exists recipient_id uuid references public.profiles (user_id) on delete cascade;

alter table public.alerts drop constraint if exists alerts_type_check;
alter table public.alerts add constraint alerts_type_check check (type in (
  'paper_missing','paper_deadline_approaching','paper_rejected','paper_printed',
  'test_overdue','test_not_conducted','results_missing','results_overdue',
  'syllabus_behind','teacher_compliance_warning','student_performance_warning',
  'class_performance_warning','subject_performance_warning'
));
create index if not exists idx_alerts_recipient on public.alerts (recipient_id);

create table if not exists public.exam_paper_print_jobs (
  id uuid primary key default gen_random_uuid(),
  exam_paper_id uuid not null references public.exam_papers (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','printed','cancelled')),
  queued_by uuid not null references public.profiles (user_id),
  queued_at timestamptz not null default now(),
  printed_by uuid references public.profiles (user_id),
  printed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_exam_paper_print_jobs_paper on public.exam_paper_print_jobs (exam_paper_id, created_at desc);
create unique index if not exists uq_exam_paper_active_print_job on public.exam_paper_print_jobs (exam_paper_id) where status = 'queued';

alter table public.exam_paper_print_jobs enable row level security;

create policy exam_paper_print_jobs_select on public.exam_paper_print_jobs
  for select using (
    public.is_owner()
    or public.is_clerk()
    or public.can_view_school_wide()
    or exists (select 1 from public.exam_papers ep where ep.id = exam_paper_print_jobs.exam_paper_id and ep.teacher_id = auth.uid())
  );

create policy exam_paper_print_jobs_insert on public.exam_paper_print_jobs
  for insert with check (
    public.is_clerk()
    and queued_by = auth.uid()
    and exists (select 1 from public.exam_papers ep where ep.id = exam_paper_print_jobs.exam_paper_id and ep.status in ('submitted','under_review','approved','conducted','results_pending','completed'))
  );

create policy exam_paper_print_jobs_update on public.exam_paper_print_jobs
  for update using (public.is_clerk()) with check (public.is_clerk());

alter policy exam_papers_select on public.exam_papers using (
  public.is_owner() or teacher_id = auth.uid() or public.is_clerk() or public.can_view_school_wide()
);

alter policy exam_papers_storage_select on storage.objects using (
  bucket_id = 'exam-papers'
  and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text or public.is_clerk() or public.can_view_school_wide())
);

alter policy alerts_select on public.alerts using (
  public.is_owner() or teacher_id = auth.uid() or recipient_id = auth.uid()
);
