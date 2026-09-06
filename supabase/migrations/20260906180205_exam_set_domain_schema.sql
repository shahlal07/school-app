-- Phase B of the Continuous Exam Set model: the exam-set domain tables.
-- These orchestrate/aggregate existing tables (schedule_items, exam_papers,
-- test_results, result_submissions) - they never duplicate marks data.
-- This migration is schema-only (additive, no behavior change to the
-- running app - nothing reads/writes these tables yet). The actual
-- auto-scheduling generation logic is a separate, later phase.

-- A class's default subject sequence (topics/chapters already have
-- order_index; subjects never got one). Coordinator/clerk/owner can already
-- write this column via the existing subjects_update_owner policy
-- (is_owner() OR can_manage_student_records(), which includes clerk) - no
-- new RLS needed, matching the product spec's explicit instruction that
-- subject/syllabus sequencing stays customizable by clerk or coordinator.
alter table public.subjects add column order_index integer not null default 0;

create table public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  set_number integer not null,
  status text not null default 'planned' check (status in ('planned','active','awaiting_completion','completed','cancelled')),
  assessment_scope text not null default 'topic' check (assessment_scope in ('topic','half_chapter','chapter','chapter_plus_half','multi_chapter','full_syllabus','custom')),
  started_on date,
  completed_on date,
  created_by uuid not null references public.profiles(user_id),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(class_id, set_number)
);

create table public.exam_set_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  sequence integer not null,
  scheduled_date date,
  schedule_item_id uuid references public.schedule_items(id),
  assessment_scope text check (assessment_scope in ('topic','half_chapter','chapter','chapter_plus_half','multi_chapter','full_syllabus','custom')),
  chapter_id uuid references public.chapters(id),
  topic_ids uuid[] not null default '{}',
  scope_overridden_by uuid references public.profiles(user_id),
  scope_override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_set_id, subject_id),
  unique(exam_set_id, sequence),
  unique(schedule_item_id)
);

create index exam_sets_class_id_idx on public.exam_sets(class_id);
create index exam_set_subjects_exam_set_id_idx on public.exam_set_subjects(exam_set_id);
create index exam_set_subjects_subject_id_idx on public.exam_set_subjects(subject_id);

alter table public.exam_sets enable row level security;
alter table public.exam_set_subjects enable row level security;

-- Visibility mirrors schedule_items exactly: owner/principal/coordinator see
-- everything school-wide, a teacher sees only sets touching their own
-- subjects, clerk has no academic-set visibility (matches the established
-- role model - clerk's printing-workflow visibility into exam_papers/
-- schedule_items is separate and unaffected by this).
create policy exam_sets_select on public.exam_sets
  for select to authenticated using (
    public.is_owner() or public.can_view_school_wide() or exists (
      select 1 from public.exam_set_subjects ess
      join public.teacher_subjects ts on ts.subject_id = ess.subject_id
      where ess.exam_set_id = exam_sets.id and ts.teacher_id = (select auth.uid())
    )
  );
create policy exam_sets_write on public.exam_sets
  for all to authenticated using (public.can_manage_academics()) with check (public.can_manage_academics());

create policy exam_set_subjects_select on public.exam_set_subjects
  for select to authenticated using (
    public.is_owner() or public.can_view_school_wide() or exists (
      select 1 from public.teacher_subjects ts
      where ts.subject_id = exam_set_subjects.subject_id and ts.teacher_id = (select auth.uid())
    )
  );
-- Per the product spec's explicit instruction: syllabus/topic scope
-- selection for a set-subject slot stays customizable by clerk or
-- coordinator (not just coordinator alone, unlike exam_sets itself).
create policy exam_set_subjects_write on public.exam_set_subjects
  for all to authenticated using (public.can_manage_academics() or public.is_clerk())
  with check (public.can_manage_academics() or public.is_clerk());
