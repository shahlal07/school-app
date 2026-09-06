create or replace function public.scan_examination_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_missing',case when si.scheduled_date<current_date then 'urgent' else 'warning' end,ts.teacher_id,'schedule_items',si.id,format('Paper for "%s" (scheduled %s) has not been submitted.',si.title,to_char(si.scheduled_date,'DD Mon YYYY'))
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id left join public.exam_papers ep on ep.schedule_item_id=si.id
  where si.status not in ('cancelled','skipped','completed') and si.scheduled_date<=current_date+interval '2 days' and (ep.id is null or ep.status in ('not_started','draft'))
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'test_overdue','urgent',ts.teacher_id,'schedule_items',si.id,format('"%s" was scheduled for %s and is still marked %s.',si.title,to_char(si.scheduled_date,'DD Mon YYYY'),si.status)
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id
  where si.status not in ('completed','cancelled','skipped') and si.scheduled_date<current_date
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'results_missing','warning',ts.teacher_id,'schedule_items',si.id,format('Results for "%s" have not been entered for students expected to have results.',si.title)
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id
  where si.status='completed'
    and ((not exists(select 1 from public.exam_attendance_sessions eas where eas.schedule_item_id=si.id))
         or exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=si.id and r.result_expected=true and r.result_id is null))
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'attendance_submission_missing',case when current_time>=time '10:00' then 'urgent' else 'warning' end,ct.teacher_id,'class_teachers',ct.id,format('First-period attendance for %s · %s has not been submitted today.',c.name,s.name)
  from public.class_teachers ct join public.classes c on c.id=ct.class_id join public.sections s on s.id=ct.section_id
  where not exists(select 1 from public.attendance_sessions a where a.class_id=ct.class_id and a.section_id=ct.section_id and a.attendance_date=current_date and a.status='submitted')
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'attendance_compliance_warning','warning',x.teacher_id,'profiles',x.teacher_id,format('%s has missed first-period attendance on %s recent class-days.',x.teacher_name,x.missed_days)
  from (select ct.teacher_id,p.full_name teacher_name,count(*)::int missed_days
        from public.class_teachers ct join public.profiles p on p.user_id=ct.teacher_id and p.role='teacher' and p.is_active
        cross join generate_series(current_date-interval '14 days',current_date,interval '1 day') d(day)
        where extract(isodow from d.day) between 1 and 5
          and not exists(select 1 from public.attendance_sessions a where a.class_id=ct.class_id and a.section_id=ct.section_id and a.attendance_date=d.day and a.status='submitted')
        group by ct.teacher_id,p.full_name having count(*)>=3) x
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'student_attendance_warning','warning',null,'students',ass.student_id,format('Student %s (%s) has attendance at %s%%.',ass.name,ass.roll_no,ass.attendance_percentage)
  from public.attendance_student_summary ass where ass.recorded_days>=5 and ass.attendance_percentage<75
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'class_attendance_warning','warning',null,'classes',x.class_id,format('Class attendance is %s%% today.',x.attendance_percentage)
  from (select ats.class_id,round(100.0*count(*) filter(where ar.status in('present','late','excused'))/nullif(count(*),0),1) attendance_percentage
        from public.attendance_records ar join public.attendance_sessions ats on ats.id=ar.session_id
        where ats.attendance_date=current_date and ats.status='submitted' group by ats.class_id) x
  where x.attendance_percentage<85 on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'exam_attendance_result_exception','urgent',si.teacher_id,'schedule_items',si.id,format('%s has students present in the exam attendance roster whose results are still missing.',si.title)
  from public.schedule_items si
  where exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=si.id and r.missing_result_after_exam_presence)
  on conflict (type,reference_id) where status='open' do nothing;

  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='attendance_submission_missing'
    and exists(select 1 from public.class_teachers ct join public.attendance_sessions ats on ats.class_id=ct.class_id and ats.section_id=ct.section_id where ct.id=a.reference_id and ats.attendance_date=current_date and ats.status='submitted');
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='student_attendance_warning'
    and exists(select 1 from public.attendance_student_summary ass where ass.student_id=a.reference_id and ass.attendance_percentage>=75);
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='class_attendance_warning'
    and exists(select 1 from public.attendance_records ar join public.attendance_sessions ats on ats.id=ar.session_id where ats.attendance_date=current_date and ats.class_id=a.reference_id and ats.status='submitted' group by ats.class_id having round(100.0*count(*) filter(where ar.status in('present','late','excused'))/nullif(count(*),0),1)>=85);
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='exam_attendance_result_exception'
    and not exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=a.reference_id and r.missing_result_after_exam_presence);
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='results_missing'
    and ((not exists(select 1 from public.exam_attendance_sessions eas where eas.schedule_item_id=a.reference_id) and exists(select 1 from public.test_results tr where tr.schedule_item_id=a.reference_id))
         or not exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=a.reference_id and r.result_expected=true and r.result_id is null));
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='paper_missing'
    and exists(select 1 from public.exam_papers ep where ep.schedule_item_id=a.reference_id and ep.status not in ('not_started','draft'));
  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='test_overdue'
    and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.status in ('completed','cancelled','skipped'));
end;
$$;
revoke execute on function public.scan_examination_compliance() from public, anon, authenticated;
