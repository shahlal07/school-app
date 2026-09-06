create policy students_select_class_teacher on public.students
for select to authenticated
using (exists (
  select 1 from public.class_teachers ct
  where ct.teacher_id = (select auth.uid())
    and ct.class_id = students.class_id
    and ct.section_id = students.section_id
));
