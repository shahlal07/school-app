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

create or replace function public.scan_examination_compliance()
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'results_missing','warning',ts.teacher_id,'schedule_items',si.id,format('Results for "%s" have not been entered for students expected to have results.',si.title)
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id
  where si.status='completed' and ((not exists(select 1 from public.exam_attendance_sessions eas where eas.schedule_item_id=si.id))
    or exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=si.id and r.result_expected=true and r.result_id is null))
  on conflict (type,reference_id) where status='open' do nothing;
end;
$$;
revoke execute on function public.scan_examination_compliance() from public, anon, authenticated;
