-- Discovered via live RLS testing with a real academic_coordinator account:
-- subjects_select was never extended to can_view_school_wide(), so a
-- coordinator could write chapters/topics/schedule_items/exam_papers (via
-- can_manage_academics()) but could not even SELECT the subjects table those
-- rows reference - every subject-name lookup across the coordinator's UI
-- (schedule, papers, performance, reports) silently returned zero rows.
-- Subjects is curriculum data, squarely bucket-4 (school-wide academic
-- visibility) alongside chapters/topics - it was omitted from that bucket
-- by oversight in the original migration. Additive: existing owner/
-- can_manage_student_records()/teacher-scoped clauses preserved verbatim.
alter policy subjects_select on public.subjects
  using (is_owner() or can_manage_student_records() or can_view_school_wide() or (exists (
    select 1 from public.teacher_subjects ts
    where ts.subject_id = subjects.id and ts.teacher_id = (select auth.uid())
  )));
