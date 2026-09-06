-- The syllabus manager UI edits subjects (rename/activate) alongside
-- chapters/topics as one unified page. Chapters/topics already allow
-- academic_coordinator write via can_manage_academics(); subjects only
-- allowed owner/principal/clerk via can_manage_student_records(). Adding
-- coordinator here so the whole syllabus page can move to a single
-- coordinator-only guard (owner is being moved to read-only across all
-- day-to-day academic operations, matching schedule/papers/results/
-- interventions/calendar/exam-sets already done today) without a broken
-- partial UI where some buttons work and others silently fail.
alter policy subjects_update_owner on public.subjects
  using (is_owner() or can_manage_student_records() or is_academic_coordinator());
alter policy subjects_delete_owner on public.subjects
  using (is_owner() or can_manage_student_records() or is_academic_coordinator());
