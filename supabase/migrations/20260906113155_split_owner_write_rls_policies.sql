-- Owner-only ALL policies also participate in SELECT evaluation and create
-- unnecessary permissive-policy overlap. Split them into explicit write commands.
drop policy if exists academic_years_write_owner_only on public.academic_years;
create policy academic_years_insert_owner on public.academic_years for insert to authenticated with check (is_owner());
create policy academic_years_update_owner on public.academic_years for update to authenticated using (is_owner()) with check (is_owner());
create policy academic_years_delete_owner on public.academic_years for delete to authenticated using (is_owner());

drop policy if exists chapters_write_owner_only on public.chapters;
create policy chapters_insert_owner on public.chapters for insert to authenticated with check (is_owner());
create policy chapters_update_owner on public.chapters for update to authenticated using (is_owner()) with check (is_owner());
create policy chapters_delete_owner on public.chapters for delete to authenticated using (is_owner());

drop policy if exists classes_write_owner_only on public.classes;
create policy classes_insert_owner on public.classes for insert to authenticated with check (is_owner());
create policy classes_update_owner on public.classes for update to authenticated using (is_owner()) with check (is_owner());
create policy classes_delete_owner on public.classes for delete to authenticated using (is_owner());

drop policy if exists department_assignments_write_owner_only on public.department_assignments;
create policy department_assignments_insert_owner on public.department_assignments for insert to authenticated with check (is_owner());
create policy department_assignments_update_owner on public.department_assignments for update to authenticated using (is_owner()) with check (is_owner());
create policy department_assignments_delete_owner on public.department_assignments for delete to authenticated using (is_owner());

drop policy if exists departments_write_owner_only on public.departments;
create policy departments_insert_owner on public.departments for insert to authenticated with check (is_owner());
create policy departments_update_owner on public.departments for update to authenticated using (is_owner()) with check (is_owner());
create policy departments_delete_owner on public.departments for delete to authenticated using (is_owner());

drop policy if exists schedule_items_write_owner_only on public.schedule_items;
create policy schedule_items_insert_owner on public.schedule_items for insert to authenticated with check (is_owner());
create policy schedule_items_update_owner on public.schedule_items for update to authenticated using (is_owner()) with check (is_owner());
create policy schedule_items_delete_owner on public.schedule_items for delete to authenticated using (is_owner());

drop policy if exists school_settings_write_owner_only on public.school_settings;
create policy school_settings_insert_owner on public.school_settings for insert to authenticated with check (is_owner());
create policy school_settings_update_owner on public.school_settings for update to authenticated using (is_owner()) with check (is_owner());
create policy school_settings_delete_owner on public.school_settings for delete to authenticated using (is_owner());

drop policy if exists sections_write_owner_only on public.sections;
create policy sections_insert_owner on public.sections for insert to authenticated with check (is_owner());
create policy sections_update_owner on public.sections for update to authenticated using (is_owner()) with check (is_owner());
create policy sections_delete_owner on public.sections for delete to authenticated using (is_owner());

drop policy if exists students_write_owner_only on public.students;
create policy students_insert_owner on public.students for insert to authenticated with check (is_owner());
create policy students_update_owner on public.students for update to authenticated using (is_owner()) with check (is_owner());
create policy students_delete_owner on public.students for delete to authenticated using (is_owner());

drop policy if exists subjects_write_owner_only on public.subjects;
create policy subjects_insert_owner on public.subjects for insert to authenticated with check (is_owner());
create policy subjects_update_owner on public.subjects for update to authenticated using (is_owner()) with check (is_owner());
create policy subjects_delete_owner on public.subjects for delete to authenticated using (is_owner());

drop policy if exists teacher_subjects_write_owner_only on public.teacher_subjects;
create policy teacher_subjects_insert_owner on public.teacher_subjects for insert to authenticated with check (is_owner());
create policy teacher_subjects_update_owner on public.teacher_subjects for update to authenticated using (is_owner()) with check (is_owner());
create policy teacher_subjects_delete_owner on public.teacher_subjects for delete to authenticated using (is_owner());

drop policy if exists topics_write_owner_only on public.topics;
create policy topics_insert_owner on public.topics for insert to authenticated with check (is_owner());
create policy topics_update_owner on public.topics for update to authenticated using (is_owner()) with check (is_owner());
create policy topics_delete_owner on public.topics for delete to authenticated using (is_owner());

drop policy if exists test_results_write on public.test_results;
create policy test_results_insert on public.test_results for insert to authenticated with check (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())));
create policy test_results_update on public.test_results for update to authenticated using (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid()))) with check (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())));
create policy test_results_delete on public.test_results for delete to authenticated using (is_owner() or exists (select 1 from public.schedule_items si join public.teacher_subjects ts on ts.subject_id = si.subject_id where si.id = test_results.schedule_item_id and ts.teacher_id = (select auth.uid())));