-- Academic intelligence workflows: interventions, result finalization,
-- paper quality metadata, and the durable compliance scanner extensions.

create table if not exists public.academic_interventions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  schedule_item_id uuid references public.schedule_items(id) on delete set null,
  created_by uuid not null references public.profiles(user_id),
  assigned_to uuid references public.profiles(user_id),
  action text not null,
  notes text,
  due_date date,
  follow_up_date date,
  outcome text,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academic_interventions_student on public.academic_interventions(student_id);
create index if not exists idx_academic_interventions_assigned on public.academic_interventions(assigned_to);
create index if not exists idx_academic_interventions_status on public.academic_interventions(status);

alter table public.academic_interventions enable row level security;
create policy academic_interventions_select on public.academic_interventions for select to authenticated using (
  public.can_view_school_wide() or assigned_to = (select auth.uid()) or created_by = (select auth.uid())
);
create policy academic_interventions_insert on public.academic_interventions for insert to authenticated with check (
  public.can_manage_academics() and created_by = (select auth.uid())
);
create policy academic_interventions_update on public.academic_interventions for update to authenticated
using (public.can_manage_academics() or assigned_to = (select auth.uid()))
with check (public.can_manage_academics() or assigned_to = (select auth.uid()));

create table if not exists public.result_submissions (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null unique references public.schedule_items(id) on delete cascade,
  teacher_id uuid not null references public.profiles(user_id),
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','finalized','rejected')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(user_id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_result_submissions_teacher on public.result_submissions(teacher_id);
create index if not exists idx_result_submissions_status on public.result_submissions(status);
alter table public.result_submissions enable row level security;
create policy result_submissions_select on public.result_submissions for select to authenticated using (
  public.can_view_school_wide() or teacher_id = (select auth.uid())
);
create policy result_submissions_insert on public.result_submissions for insert to authenticated with check (
  (teacher_id = (select auth.uid()) and exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = schedule_item_id and ts.teacher_id = (select auth.uid())
  )) or public.is_owner() or public.is_academic_coordinator()
);
create policy result_submissions_update on public.result_submissions for update to authenticated
using (teacher_id = (select auth.uid()) or public.is_owner() or public.is_academic_coordinator())
with check (teacher_id = (select auth.uid()) or public.is_owner() or public.is_academic_coordinator());

create or replace function public.enforce_result_submission_workflow()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  if old.status = 'finalized' and new.status <> 'finalized' and not (public.is_owner() or public.is_academic_coordinator()) then
    raise exception 'Finalized results cannot be changed by this user.';
  end if;
  if not (public.is_owner() or public.is_academic_coordinator()) then
    if new.status in ('reviewed','finalized') then
      raise exception 'Only the academic coordinator or owner can review or finalize results.';
    end if;
    if old.status in ('submitted','reviewed','finalized') and new.status <> old.status then
      raise exception 'Submitted results are locked until reviewed.';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at or new.review_notes is distinct from old.review_notes then
      raise exception 'Only the academic coordinator or owner can set review fields.';
    end if;
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_result_submission_workflow on public.result_submissions;
create trigger trg_enforce_result_submission_workflow before update on public.result_submissions for each row execute function public.enforce_result_submission_workflow();
revoke execute on function public.enforce_result_submission_workflow() from public, anon, authenticated;

alter table public.exam_papers add column if not exists quality_check jsonb not null default '{}'::jsonb;
alter table public.exam_papers add column if not exists quality_checked_at timestamptz;
alter table public.exam_papers add column if not exists quality_checked_by uuid references public.profiles(user_id);
create index if not exists idx_exam_papers_print_status on public.exam_papers(print_status);

-- Alert type expansion needed by the scanner extension.
alter table public.alerts drop constraint if exists alerts_type_check;
alter table public.alerts add constraint alerts_type_check check (type = any (array[
  'paper_missing','paper_deadline_approaching','paper_rejected','paper_printed','paper_approved',
  'test_overdue','test_not_conducted','results_missing','results_overdue','syllabus_behind',
  'teacher_compliance_warning','student_performance_warning','class_performance_warning','subject_performance_warning'
]));
