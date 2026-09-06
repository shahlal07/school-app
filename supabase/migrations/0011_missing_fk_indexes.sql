-- Phase 11 security/performance audit: add indexes for foreign keys the
-- Supabase performance advisor flagged as uncovered. Purely additive - no
-- behavior change, safe at any time, unlike touching RLS policy text.

create index idx_alerts_resolved_by on public.alerts (resolved_by);
create index idx_classes_academic_year on public.classes (academic_year_id);
create index idx_exam_papers_reviewed_by on public.exam_papers (reviewed_by);
create index idx_messages_sender on public.messages (sender_id);
create index idx_schedule_items_chapter on public.schedule_items (chapter_id);
create index idx_schedule_items_topic on public.schedule_items (topic_id);
create index idx_students_section on public.students (section_id);
create index idx_teacher_subjects_class on public.teacher_subjects (class_id);
create index idx_test_results_entered_by on public.test_results (entered_by);
