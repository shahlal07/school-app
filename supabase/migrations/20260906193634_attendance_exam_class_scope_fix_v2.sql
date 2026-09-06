alter table public.exam_attendance_sessions alter column section_id drop not null;

create or replace function public.submit_exam_attendance(
  p_schedule_item_id uuid,
  p_records jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session public.exam_attendance_sessions%rowtype;
  v_schedule public.schedule_items%rowtype;
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_schedule from public.schedule_items where id = p_schedule_item_id;
  if not found then raise exception 'schedule_not_found'; end if;
  insert into public.exam_attendance_sessions(schedule_item_id,class_id,section_id,attendance_date,status,recorded_by,recorded_at)
  values (v_schedule.id,v_schedule.class_id,null,v_schedule.scheduled_date,'draft',v_uid,now())
  on conflict (schedule_item_id) do update set updated_at=now()
  returning * into v_session;
  if jsonb_typeof(p_records) <> 'array' then raise exception 'records_must_be_array'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_records) as r(student_id uuid, roll_no text, status text, note text)
    left join public.students s on s.id=r.student_id
    where s.id is null or s.class_id <> v_schedule.class_id or not s.is_active or r.status not in ('present','absent','excused')
  ) then raise exception 'invalid_student_roster'; end if;
  insert into public.exam_attendance_records(exam_attendance_session_id,student_id,roll_no_snapshot,status,note,marked_at)
  select v_session.id,r.student_id,r.roll_no,r.status,nullif(r.note,''),now()
  from jsonb_to_recordset(p_records) as r(student_id uuid, roll_no text, status text, note text)
  on conflict (exam_attendance_session_id,student_id)
  do update set roll_no_snapshot=excluded.roll_no_snapshot,status=excluded.status,note=excluded.note,marked_at=now();
  select count(*) into v_count from public.exam_attendance_records where exam_attendance_session_id=v_session.id;
  if v_count = 0 then raise exception 'no_records'; end if;
  update public.exam_attendance_sessions set status='submitted',recorded_by=v_uid,recorded_at=now(),updated_at=now() where id=v_session.id;
  return v_session.id;
end;
$$;

revoke execute on function public.submit_exam_attendance(uuid,jsonb) from public;
revoke execute on function public.submit_exam_attendance(uuid,jsonb) from anon;
grant execute on function public.submit_exam_attendance(uuid,jsonb) to authenticated;

drop view if exists public.attendance_academic_signal;
drop view if exists public.exam_attendance_reconciliation;
drop view if exists public.attendance_student_summary;

create view public.attendance_student_summary with (security_invoker = true) as
select s.id student_id,s.class_id,s.section_id,s.roll_no,s.name,
       count(ats.id)::int recorded_days,
       count(*) filter (where ar.status in ('present','late','excused'))::int attended_days,
       count(*) filter (where ar.status='absent')::int absent_days,
       count(*) filter (where ar.status='late')::int late_days,
       count(*) filter (where ar.status='leave')::int leave_days,
       round(100.0*count(*) filter (where ar.status in ('present','late','excused'))/nullif(count(ats.id),0),1) attendance_percentage
from public.students s
left join public.attendance_records ar on ar.student_id=s.id
left join public.attendance_sessions ats on ats.id=ar.session_id and ats.status='submitted'
where s.is_active
group by s.id,s.class_id,s.section_id,s.roll_no,s.name;

create view public.exam_attendance_reconciliation with (security_invoker = true) as
select si.id schedule_item_id,si.class_id,si.subject_id,si.scheduled_date,si.title,s.section_id,s.id student_id,s.roll_no,s.name,
       ear.status exam_attendance_status,tr.id result_id,tr.is_absent result_absent,tr.marks_obtained,tr.total_marks,
       case when ear.status='absent' then false when ear.status in ('present','excused') then true else null end result_expected,
       case when ear.status in ('present','excused') and tr.id is null then true else false end missing_result_after_exam_presence
from public.schedule_items si
join public.students s on s.class_id=si.class_id and s.is_active
left join public.exam_attendance_sessions eas on eas.schedule_item_id=si.id and eas.status='submitted'
left join public.exam_attendance_records ear on ear.exam_attendance_session_id=eas.id and ear.student_id=s.id
left join public.test_results tr on tr.schedule_item_id=si.id and tr.student_id=s.id;

create view public.attendance_academic_signal with (security_invoker = true) as
select ass.student_id,ass.class_id,ass.section_id,ass.roll_no,ass.name,ass.attendance_percentage,
       coalesce(sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.marks_obtained end),0) marks_sum,
       coalesce(sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.total_marks end),0) possible_sum,
       round(100.0*sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.marks_obtained end)/nullif(sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.total_marks end),0),1) assessment_percentage,
       case when ass.attendance_percentage < 75 and round(100.0*sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.marks_obtained end)/nullif(sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.total_marks end),0),1) < 50 then 'attendance_and_academic'
            when ass.attendance_percentage < 75 then 'attendance_primary'
            when ass.attendance_percentage >= 90 and round(100.0*sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.marks_obtained end)/nullif(sum(case when tr.is_absent=false and tr.marks_obtained is not null then tr.total_marks end),0),1) < 50 then 'academic_despite_attendance'
            else 'normal' end signal
from public.attendance_student_summary ass
left join public.test_results tr on tr.student_id=ass.student_id
group by ass.student_id,ass.class_id,ass.section_id,ass.roll_no,ass.name,ass.attendance_percentage;
