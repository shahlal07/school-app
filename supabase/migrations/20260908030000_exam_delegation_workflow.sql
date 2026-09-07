alter table public.exam_papers add column if not exists handed_to_clerk_at timestamptz;
alter table public.exam_papers add column if not exists handed_to_clerk_by uuid references public.profiles(user_id);
alter table public.test_results add column if not exists entered_by_clerk boolean not null default false;

alter table public.alerts drop constraint if exists alerts_type_check;
alter table public.alerts add constraint alerts_type_check check (type = any (array[
  'paper_missing','paper_deadline_approaching','paper_rejected','test_overdue','test_not_conducted','results_missing','results_overdue','syllabus_behind','teacher_compliance_warning','student_performance_warning','class_performance_warning','subject_performance_warning','paper_printed','attendance_submission_missing','attendance_compliance_warning','student_attendance_warning','class_attendance_warning','exam_attendance_result_exception','paper_handoff_reminder','results_deadline_countdown'
]));

create or replace function public.mark_paper_handed_to_clerk(p_schedule_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_paper uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select ep.id into v_paper
  from public.exam_papers ep
  join public.schedule_items si on si.id = ep.schedule_item_id
  where ep.schedule_item_id = p_schedule_item_id and ep.teacher_id = v_user
  for update;
  if v_paper is null then raise exception 'not_authorized'; end if;
  update public.exam_papers
  set handed_to_clerk_at = coalesce(handed_to_clerk_at, now()),
      handed_to_clerk_by = coalesce(handed_to_clerk_by, v_user),
      updated_at = now()
  where id = v_paper;
  update public.alerts
  set status='resolved', resolved_at=now(), resolved_by=v_user
  where status='open' and type='paper_handoff_reminder' and reference_id=p_schedule_item_id;
end;
$$;
revoke execute on function public.mark_paper_handed_to_clerk(uuid) from public;
grant execute on function public.mark_paper_handed_to_clerk(uuid) to authenticated;

create or replace function public.clerk_upload_test_results(p_schedule_item_id uuid, p_total_marks int, p_results jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_class uuid;
  v_count int;
  v_expected int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.is_clerk() then raise exception 'not_authorized'; end if;
  if p_total_marks is null or p_total_marks <= 0 then raise exception 'invalid_total_marks'; end if;
  if jsonb_typeof(p_results) <> 'array' then raise exception 'invalid_results_payload'; end if;
  select class_id into v_class from public.schedule_items where id=p_schedule_item_id;
  if v_class is null then raise exception 'schedule_not_found'; end if;
  select count(*) into v_expected from public.students s
    join public.schedule_items si on si.class_id=s.class_id and si.id=p_schedule_item_id
    where s.class_id=v_class and s.is_active=true;
  select count(*) into v_count from jsonb_array_elements(p_results);
  if v_count <> v_expected then raise exception 'roster_mismatch'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_results) r
    where not exists (select 1 from public.students s where s.id=(r->>'student_id')::uuid and s.class_id=v_class and s.is_active=true)
      or ((r->>'is_absent')::boolean=false and ((r->>'marks_obtained') is null or ((r->>'marks_obtained')::numeric < 0) or ((r->>'marks_obtained')::numeric > p_total_marks)))
  ) then raise exception 'invalid_roster_submission'; end if;
  insert into public.test_results(schedule_item_id,student_id,marks_obtained,total_marks,is_absent,remarks,entered_by,entered_at,entered_by_clerk)
  select p_schedule_item_id,(r->>'student_id')::uuid,
    case when coalesce((r->>'is_absent')::boolean,false) then null else (r->>'marks_obtained')::numeric end,
    p_total_marks,coalesce((r->>'is_absent')::boolean,false),nullif(r->>'remarks',''),v_user,now(),true
  from jsonb_array_elements(p_results) r
  on conflict (schedule_item_id,student_id) do update set
    marks_obtained=excluded.marks_obtained,total_marks=excluded.total_marks,is_absent=excluded.is_absent,
    remarks=excluded.remarks,entered_by=excluded.entered_by,entered_at=excluded.entered_at,entered_by_clerk=true;
end;
$$;
revoke execute on function public.clerk_upload_test_results(uuid,int,jsonb) from public;
grant execute on function public.clerk_upload_test_results(uuid,int,jsonb) to authenticated;

create or replace function public.submit_attendance(p_class_id uuid,p_section_id uuid,p_attendance_date date,p_records jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_user uuid := (select auth.uid()); v_session uuid; v_count int; v_expected int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not (exists(select 1 from public.class_teachers ct where ct.teacher_id=v_user and ct.class_id=p_class_id and ct.section_id=p_section_id)
          or is_owner() or is_principal() or is_academic_coordinator() or is_clerk()) then raise exception 'not_authorized'; end if;
  if not (is_owner() or is_principal() or is_academic_coordinator())
     and p_attendance_date <> (now() at time zone 'Asia/Karachi')::date then raise exception 'teacher_attendance_date_must_be_today'; end if;
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
  join public.students s on s.id=(r->>'student_id')::uuid
  cross join lateral jsonb_to_record(r) as x(student_id text,status text,note text)
  where s.class_id=p_class_id and s.section_id=p_section_id and s.is_active=true;
  if (select count(*) from public.attendance_records ar where ar.session_id=v_session) <> v_expected then raise exception 'invalid_roster_submission'; end if;
  return v_session;
end;
$$;

alter policy attendance_sessions_insert on public.attendance_sessions
  with check ((submitted_by = (select auth.uid())) and (is_owner() or is_principal() or is_academic_coordinator() or is_clerk() or exists (select 1 from class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=attendance_sessions.class_id and ct.section_id=attendance_sessions.section_id)));
alter policy attendance_sessions_update on public.attendance_sessions
  using (can_view_school_wide() or submitted_by=(select auth.uid()) or is_clerk())
  with check (can_view_school_wide() or submitted_by=(select auth.uid()) or is_clerk());
alter policy attendance_records_insert on public.attendance_records
  with check (exists (select 1 from attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or is_clerk() or exists (select 1 from class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))));
alter policy attendance_records_update on public.attendance_records
  using (exists (select 1 from attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or is_clerk() or exists (select 1 from class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))))
  with check (exists (select 1 from attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or is_clerk() or exists (select 1 from class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))));

create or replace function public.scan_examination_compliance()
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_missing',case when si.scheduled_date<current_date then 'urgent' else 'warning' end,si.teacher_id,'schedule_items',si.id,format('Paper for "%s" (scheduled %s) has not been submitted.',si.title,to_char(si.scheduled_date,'DD Mon YYYY'))
  from public.schedule_items si left join public.exam_papers ep on ep.schedule_item_id=si.id
  where si.status not in ('cancelled','skipped','completed') and si.scheduled_date<=current_date+interval '2 days' and (ep.id is null or ep.status in ('not_started','draft'))
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_handoff_reminder','warning',si.teacher_id,'schedule_items',si.id,format('Paper for "%s" is due in 2 days. Submit it digitally or hand it to the clerk.',si.title)
  from public.schedule_items si left join public.exam_papers ep on ep.schedule_item_id=si.id
  where si.status not in ('cancelled','skipped','completed')
    and si.scheduled_date=current_date+2
    and (ep.id is null or (ep.status in ('not_started','draft') and ep.handed_to_clerk_at is null))
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'results_deadline_countdown',case when now() >= (si.scheduled_date::timestamp at time zone 'Asia/Karachi') + interval '42 hours' then 'urgent' else 'warning' end,si.teacher_id,'schedule_items',si.id,format('Results for "%s" are due within 48 hours of the exam date.',si.title)
  from public.schedule_items si
  where si.status not in ('cancelled','skipped')
    and si.scheduled_date < current_date
    and now() < (si.scheduled_date::timestamp at time zone 'Asia/Karachi') + interval '48 hours'
    and (select count(*) from public.test_results tr where tr.schedule_item_id=si.id) < (select count(*) from public.students s where s.class_id=si.class_id and s.is_active=true)
  on conflict (type,reference_id) where status='open' do nothing;

  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='paper_handoff_reminder' and exists(select 1 from public.exam_papers ep where ep.schedule_item_id=a.reference_id and (ep.handed_to_clerk_at is not null or ep.status not in ('not_started','draft')));
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='results_deadline_countdown' and (exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.scheduled_date>=current_date) or not exists(select 1 from public.schedule_items si where si.id=a.reference_id) or not exists(select 1 from public.schedule_items si where si.id=a.reference_id and (select count(*) from public.test_results tr where tr.schedule_item_id=si.id) < (select count(*) from public.students s where s.class_id=si.class_id and s.is_active=true)));

  -- Existing compliance rules remain active; these additions intentionally share the existing hourly scanner.
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'test_overdue','urgent',si.teacher_id,'schedule_items',si.id,format('"%s" was scheduled for %s and is still marked %s.',si.title,to_char(si.scheduled_date,'DD Mon YYYY'),si.status)
  from public.schedule_items si where si.status not in ('completed','cancelled','skipped') and si.scheduled_date<current_date
  on conflict (type,reference_id) where status='open' do nothing;
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='test_overdue' and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.status in ('completed','cancelled','skipped'));
end;
$$;
revoke execute on function public.scan_examination_compliance() from public,anon,authenticated;
