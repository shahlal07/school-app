-- Phase A: Role-Based School Administration Expansion — schema + RLS foundation.
-- Additive only: no existing table dropped, no existing policy narrowed or replaced
-- wholesale. Every ALTER POLICY below re-states the existing predicate and ORs in
-- the new clause, so prior owner/teacher access is byte-for-byte preserved.

-- ============================================================
-- 1. profiles.role: extend the check constraint (additive superset)
-- ============================================================
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['owner','principal','academic_coordinator','clerk','teacher']));

-- ============================================================
-- 2. profiles: new optional staff-record columns
-- ============================================================
alter table public.profiles add column if not exists designation text;
alter table public.profiles add column if not exists joining_date date;

-- ============================================================
-- 3. class_teachers: homeroom assignment table
-- ============================================================
create table public.class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  teacher_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, section_id)
);

alter table public.class_teachers enable row level security;

-- ============================================================
-- 4. New RLS helper functions (same hardened pattern as is_owner())
-- ============================================================
create function public.is_principal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'principal' and is_active = true
  );
$$;

create function public.is_academic_coordinator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'academic_coordinator' and is_active = true
  );
$$;

create function public.is_clerk()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'clerk' and is_active = true
  );
$$;

-- Operational academic write authority: owner + academic_coordinator ONLY.
-- Principal is deliberately excluded — Phase A gives principal school-wide
-- READ (can_view_school_wide) but not operational write authority.
create function public.can_manage_academics()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or public.is_academic_coordinator();
$$;

-- Student/staff record administration: owner + principal + clerk.
create function public.can_manage_student_records()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or public.is_principal() or public.is_clerk();
$$;

-- School-wide academic READ (not write): owner + principal + academic_coordinator.
create function public.can_view_school_wide()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or public.is_principal() or public.is_academic_coordinator();
$$;

revoke execute on function public.is_principal() from public, anon;
revoke execute on function public.is_academic_coordinator() from public, anon;
revoke execute on function public.is_clerk() from public, anon;
revoke execute on function public.can_manage_academics() from public, anon;
revoke execute on function public.can_manage_student_records() from public, anon;
revoke execute on function public.can_view_school_wide() from public, anon;
grant execute on function public.is_principal() to authenticated;
grant execute on function public.is_academic_coordinator() to authenticated;
grant execute on function public.is_clerk() to authenticated;
grant execute on function public.can_manage_academics() to authenticated;
grant execute on function public.can_manage_student_records() to authenticated;
grant execute on function public.can_view_school_wide() to authenticated;

-- ============================================================
-- 5. class_teachers RLS policies
-- ============================================================
-- Structural read, same convention as classes/sections (everyone authenticated).
create policy class_teachers_select_authenticated on public.class_teachers
  for select to authenticated using (true);

-- Assignment authority: owner + principal + academic_coordinator (oversight roles),
-- not clerk (student-record admin, not academic/staffing assignment) and not a
-- bare can_manage_academics()/can_manage_student_records() reuse since the actual
-- allowed set (owner+principal+coordinator) doesn't match either composite 1:1.
create policy class_teachers_insert on public.class_teachers
  for insert to authenticated
  with check (public.is_owner() or public.is_principal() or public.is_academic_coordinator());

create policy class_teachers_update on public.class_teachers
  for update to authenticated
  using (public.is_owner() or public.is_principal() or public.is_academic_coordinator())
  with check (public.is_owner() or public.is_principal() or public.is_academic_coordinator());

create policy class_teachers_delete on public.class_teachers
  for delete to authenticated
  using (public.is_owner() or public.is_principal() or public.is_academic_coordinator());

-- ============================================================
-- 6. Narrow scoped RPC for staff-record fields (designation/joining_date)
--    Deliberately NOT a profiles RLS policy change — profiles stays
--    owner-only at the row-policy level (bucket 1, system administration),
--    this function is the sole additional write path for the two new columns.
-- ============================================================
create function public.set_staff_record_fields(
  p_user_id uuid,
  p_designation text,
  p_joining_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_student_records() then
    raise exception 'insufficient_privilege';
  end if;

  update public.profiles
  set designation = p_designation,
      joining_date = p_joining_date,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.set_staff_record_fields(uuid, text, date) from public, anon;
grant execute on function public.set_staff_record_fields(uuid, text, date) to authenticated;

-- ============================================================
-- 7. Bucket 2 — Student-record administration writes:
--    owner + principal + clerk (additive OR onto existing owner-only clauses)
-- ============================================================
alter policy students_insert_owner on public.students
  with check (is_owner() or can_manage_student_records());
alter policy students_update_owner on public.students
  using (is_owner() or can_manage_student_records())
  with check (is_owner() or can_manage_student_records());
alter policy students_delete_owner on public.students
  using (is_owner() or can_manage_student_records());
-- students_select: add principal/clerk read (existing owner + teacher-by-class clause preserved)
alter policy students_select on public.students
  using (is_owner() or can_manage_student_records() or (exists (
    select 1 from public.teacher_subjects ts
    where ts.class_id = students.class_id and ts.teacher_id = (select auth.uid())
  )));

alter policy classes_insert_owner on public.classes
  with check (is_owner() or can_manage_student_records());
alter policy classes_update_owner on public.classes
  using (is_owner() or can_manage_student_records())
  with check (is_owner() or can_manage_student_records());
alter policy classes_delete_owner on public.classes
  using (is_owner() or can_manage_student_records());
-- classes_select_authenticated is already `true` for all authenticated users — no change.

alter policy sections_insert_owner on public.sections
  with check (is_owner() or can_manage_student_records());
alter policy sections_update_owner on public.sections
  using (is_owner() or can_manage_student_records())
  with check (is_owner() or can_manage_student_records());
alter policy sections_delete_owner on public.sections
  using (is_owner() or can_manage_student_records());
-- sections_select_authenticated is already `true` for all authenticated users — no change.

alter policy subjects_insert_owner on public.subjects
  with check (is_owner() or can_manage_student_records());
alter policy subjects_update_owner on public.subjects
  using (is_owner() or can_manage_student_records())
  with check (is_owner() or can_manage_student_records());
alter policy subjects_delete_owner on public.subjects
  using (is_owner() or can_manage_student_records());
-- subjects_select: principal/clerk need read to manage the catalog; teacher-scoped clause preserved.
alter policy subjects_select on public.subjects
  using (is_owner() or can_manage_student_records() or (exists (
    select 1 from public.teacher_subjects ts
    where ts.subject_id = subjects.id and ts.teacher_id = (select auth.uid())
  )));

alter policy teacher_subjects_insert_owner on public.teacher_subjects
  with check (is_owner() or can_manage_student_records());
alter policy teacher_subjects_update_owner on public.teacher_subjects
  using (is_owner() or can_manage_student_records())
  with check (is_owner() or can_manage_student_records());
alter policy teacher_subjects_delete_owner on public.teacher_subjects
  using (is_owner() or can_manage_student_records());
-- teacher_subjects_select: principal/clerk need read to manage assignments; own-row clause preserved.
alter policy teacher_subjects_select on public.teacher_subjects
  using (is_owner() or can_manage_student_records() or (teacher_id = (select auth.uid())));

-- ============================================================
-- 8. Bucket 3 — Academic operational management writes: owner + coordinator
-- ============================================================
alter policy chapters_insert_owner on public.chapters
  with check (is_owner() or can_manage_academics());
alter policy chapters_update_owner on public.chapters
  using (is_owner() or can_manage_academics())
  with check (is_owner() or can_manage_academics());
alter policy chapters_delete_owner on public.chapters
  using (is_owner() or can_manage_academics());

alter policy topics_insert_owner on public.topics
  with check (is_owner() or can_manage_academics());
alter policy topics_update_owner on public.topics
  using (is_owner() or can_manage_academics())
  with check (is_owner() or can_manage_academics());
alter policy topics_delete_owner on public.topics
  using (is_owner() or can_manage_academics());

alter policy schedule_items_insert_owner on public.schedule_items
  with check (is_owner() or can_manage_academics());
alter policy schedule_items_update_owner on public.schedule_items
  using (is_owner() or can_manage_academics())
  with check (is_owner() or can_manage_academics());
alter policy schedule_items_delete_owner on public.schedule_items
  using (is_owner() or can_manage_academics());

alter policy exam_papers_insert on public.exam_papers
  with check (is_owner() or can_manage_academics() or ((teacher_id = (select auth.uid())) and exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = exam_papers.schedule_item_id and ts.teacher_id = (select auth.uid())
  )));
alter policy exam_papers_update on public.exam_papers
  using (is_owner() or can_manage_academics() or (teacher_id = (select auth.uid())))
  with check (is_owner() or can_manage_academics() or (teacher_id = (select auth.uid())));
alter policy exam_papers_delete_owner_only on public.exam_papers
  using (is_owner() or can_manage_academics());

alter policy test_results_insert on public.test_results
  with check (is_owner() or can_manage_academics() or exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())
  ));
alter policy test_results_update on public.test_results
  using (is_owner() or can_manage_academics() or exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())
  ))
  with check (is_owner() or can_manage_academics() or exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())
  ));
alter policy test_results_delete on public.test_results
  using (is_owner() or can_manage_academics() or exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())
  ));

alter policy alerts_update_owner_only on public.alerts
  using (is_owner() or can_manage_academics())
  with check (is_owner() or can_manage_academics());
alter policy alerts_delete_owner_only on public.alerts
  using (is_owner() or can_manage_academics());

-- ============================================================
-- 9. Bucket 4 — School-wide academic visibility (SELECT only): owner + principal + coordinator
--    Additive OR onto the existing owner/teacher-scoped SELECT clauses — those
--    clauses are preserved verbatim.
-- ============================================================
alter policy chapters_select on public.chapters
  using (is_owner() or can_view_school_wide() or exists (
    select 1 from public.teacher_subjects ts
    where ts.subject_id = chapters.subject_id and ts.teacher_id = (select auth.uid())
  ));

alter policy topics_select on public.topics
  using (is_owner() or can_view_school_wide() or exists (
    select 1 from public.teacher_subjects ts
    join public.chapters c on c.subject_id = ts.subject_id
    where c.id = topics.chapter_id and ts.teacher_id = (select auth.uid())
  ));

alter policy schedule_items_select on public.schedule_items
  using (is_owner() or can_view_school_wide() or exists (
    select 1 from public.teacher_subjects ts
    where ts.subject_id = schedule_items.subject_id and ts.teacher_id = (select auth.uid())
  ));

alter policy exam_papers_select on public.exam_papers
  using (is_owner() or can_view_school_wide() or (teacher_id = (select auth.uid())));

alter policy test_results_select on public.test_results
  using (is_owner() or can_view_school_wide() or exists (
    select 1 from public.schedule_items si
    join public.teacher_subjects ts on ts.subject_id = si.subject_id
    where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())
  ));

alter policy alerts_select on public.alerts
  using (is_owner() or can_view_school_wide() or (teacher_id = (select auth.uid())));
