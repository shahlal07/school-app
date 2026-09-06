-- Cache auth.uid() per statement and prevent ownership reassignment on UPDATE.
alter policy alerts_select on public.alerts using (is_owner() or (teacher_id = (select auth.uid())));
alter policy audit_logs_insert on public.audit_logs with check (is_owner() or (actor_id = (select auth.uid())));
alter policy chapters_select on public.chapters using (is_owner() or exists (select 1 from public.teacher_subjects ts where ts.subject_id = chapters.subject_id and ts.teacher_id = (select auth.uid())));
alter policy department_assignments_select on public.department_assignments using (is_owner() or (user_id = (select auth.uid())));
alter policy exam_papers_select on public.exam_papers using (is_owner() or (teacher_id = (select auth.uid())));
alter policy exam_papers_insert on public.exam_papers with check (is_owner() or ((teacher_id = (select auth.uid())) and exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = exam_papers.schedule_item_id and ts.teacher_id = (select auth.uid()))));
alter policy exam_papers_update on public.exam_papers using (is_owner() or (teacher_id = (select auth.uid()))) with check (is_owner() or (teacher_id = (select auth.uid())));
alter policy messages_insert on public.messages with check ((sender_id = (select auth.uid())) and (is_owner() or exists (select 1 from public.profiles p where p.user_id = messages.recipient_id and p.role = 'owner')));
alter policy messages_select on public.messages using (is_owner() or (sender_id = (select auth.uid())) or (recipient_id = (select auth.uid())));
alter policy messages_update_read_status on public.messages using ((recipient_id = (select auth.uid())) or is_owner()) with check ((recipient_id = (select auth.uid())) or is_owner());
alter policy profiles_select on public.profiles using (is_owner() or (user_id = (select auth.uid())));
alter policy profiles_update on public.profiles using (is_owner() or (user_id = (select auth.uid()))) with check (is_owner() or (user_id = (select auth.uid())));
alter policy schedule_items_select on public.schedule_items using (is_owner() or exists (select 1 from public.teacher_subjects ts where ts.subject_id = schedule_items.subject_id and ts.teacher_id = (select auth.uid())));
alter policy students_select on public.students using (is_owner() or exists (select 1 from public.teacher_subjects ts where ts.class_id = students.class_id and ts.teacher_id = (select auth.uid())));
alter policy subjects_select on public.subjects using (is_owner() or exists (select 1 from public.teacher_subjects ts where ts.subject_id = subjects.id and ts.teacher_id = (select auth.uid())));
alter policy teacher_subjects_select on public.teacher_subjects using (is_owner() or (teacher_id = (select auth.uid())));
alter policy test_results_select on public.test_results using (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())));
alter policy test_results_write on public.test_results using (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid()))) with check (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())));
alter policy topics_select on public.topics using (is_owner() or exists (select 1 from public.teacher_subjects ts join public.chapters c on c.subject_id = ts.subject_id where c.id = topics.chapter_id and ts.teacher_id = (select auth.uid())));

-- The five public-role catalog reads are authenticated-only in the next migration.
alter policy academic_years_select_authenticated on public.academic_years to authenticated using (true);
alter policy classes_select_authenticated on public.classes to authenticated using (true);
alter policy departments_select_authenticated on public.departments to authenticated using (true);
alter policy school_settings_select_authenticated on public.school_settings to authenticated using (true);
alter policy sections_select_authenticated on public.sections to authenticated using (true);