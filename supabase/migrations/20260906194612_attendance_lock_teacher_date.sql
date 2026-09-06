create or replace function public.submit_attendance(p_class_id uuid,p_section_id uuid,p_attendance_date date,p_records jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user uuid := (select auth.uid()); v_session uuid; v_count int; v_expected int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not (exists(select 1 from public.class_teachers ct where ct.teacher_id=v_user and ct.class_id=p_class_id and ct.section_id=p_section_id) or is_owner() or is_principal() or is_academic_coordinator()) then raise exception 'not_authorized'; end if;
  if not (is_owner() or is_principal() or is_academic_coordinator()) and p_attendance_date <> (now() at time zone 'Asia/Karachi')::date then raise exception 'teacher_attendance_date_must_be_today'; end if;
  select count(*) into v_expected from public.students s where s.class_id=p_class_id and s.section_id=p_section_id and s.is_active=true;
  select count(*) into v_count from jsonb_array_elements(p_records);
  if v_count <> v_expected then raise exception 'roster_mismatch'; end if;
  insert into public.attendance_sessions(attendance_date,class_id,section_id,submitted_by,status,submitted_at,updated_at)
  values(p_attendance_date,p_class_id,p_section_id,v_user,'submitted',now(),now())
  on conflict(attendance_date,class_id,section_id) do update set submitted_by=excluded.submitted_by,status='submitted',submitted_at=now(),updated_at=now()
  returning id into v_session;
  delete from public.attendance_records where session_id=v_session;
  insert into public.attendance_records(session_id,student_id,roll_no_snapshot,status,note)
  select v_session,s.id,s.roll_no,x.status,nullif(x.note,'') from jsonb_array_elements(p_records) r
  join public.students s on s.id=(r->>'student_id')::uuid cross join lateral jsonb_to_record(r) as x(student_id text,status text,note text)
  where s.class_id=p_class_id and s.section_id=p_section_id and s.is_active=true;
  if (select count(*) from public.attendance_records ar where ar.session_id=v_session) <> v_expected then raise exception 'invalid_roster_submission'; end if;
  return v_session;
end; $$;
