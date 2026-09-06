drop policy if exists exam_attendance_session_select on public.exam_attendance_sessions;
create policy exam_attendance_session_select on public.exam_attendance_sessions for select using (
  public.is_owner() or public.can_view_school_wide()
  or exists (select 1 from public.schedule_items si where si.id=exam_attendance_sessions.schedule_item_id
    and (si.teacher_id=auth.uid() or exists (select 1 from public.class_teachers ct where ct.teacher_id=auth.uid() and ct.class_id=exam_attendance_sessions.class_id)))
);

drop policy if exists exam_attendance_session_insert on public.exam_attendance_sessions;
create policy exam_attendance_session_insert on public.exam_attendance_sessions for insert with check (
  public.is_owner() or public.can_manage_academics()
  or exists (select 1 from public.schedule_items si where si.id=exam_attendance_sessions.schedule_item_id
    and (si.teacher_id=auth.uid() or exists (select 1 from public.class_teachers ct where ct.teacher_id=auth.uid() and ct.class_id=exam_attendance_sessions.class_id)))
);

drop policy if exists exam_attendance_record_select on public.exam_attendance_records;
create policy exam_attendance_record_select on public.exam_attendance_records for select using (
  public.is_owner() or public.can_view_school_wide()
  or exists (
    select 1 from public.exam_attendance_sessions eas
    join public.schedule_items si on si.id=eas.schedule_item_id
    where eas.id=exam_attendance_records.exam_attendance_session_id
      and (si.teacher_id=auth.uid() or exists (
        select 1 from public.class_teachers ct
        join public.students student_scope on student_scope.id=exam_attendance_records.student_id
        where ct.teacher_id=auth.uid() and ct.class_id=eas.class_id and ct.section_id=student_scope.section_id
      ))
  )
);

drop policy if exists exam_attendance_record_write on public.exam_attendance_records;
create policy exam_attendance_record_write on public.exam_attendance_records for all using (
  public.is_owner() or public.can_manage_academics()
  or exists (
    select 1 from public.exam_attendance_sessions eas join public.schedule_items si on si.id=eas.schedule_item_id
    where eas.id=exam_attendance_records.exam_attendance_session_id
      and (si.teacher_id=auth.uid() or eas.recorded_by=auth.uid() or exists (
        select 1 from public.class_teachers ct join public.students student_scope on student_scope.id=exam_attendance_records.student_id
        where ct.teacher_id=auth.uid() and ct.class_id=eas.class_id and ct.section_id=student_scope.section_id
      ))
  )
) with check (
  public.is_owner() or public.can_manage_academics()
  or exists (
    select 1 from public.exam_attendance_sessions eas join public.schedule_items si on si.id=eas.schedule_item_id
    where eas.id=exam_attendance_records.exam_attendance_session_id
      and (si.teacher_id=auth.uid() or eas.recorded_by=auth.uid() or exists (
        select 1 from public.class_teachers ct join public.students student_scope on student_scope.id=exam_attendance_records.student_id
        where ct.teacher_id=auth.uid() and ct.class_id=eas.class_id and ct.section_id=student_scope.section_id
      ))
  )
);

-- Result-alert scanner is intentionally left untouched here; the complete
-- corrected function is established by 20260906194151 and remains the source
-- of truth for all examination + attendance alerts.
