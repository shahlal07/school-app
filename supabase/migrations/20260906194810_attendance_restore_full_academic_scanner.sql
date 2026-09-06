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
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id where si.status not in ('completed','cancelled','skipped') and si.scheduled_date<current_date
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_rejected','warning',ep.teacher_id,'exam_papers',ep.id,format('Exam paper "%s" is awaiting a correction after rejection.',si.title)
  from public.exam_papers ep join public.schedule_items si on si.id=ep.schedule_item_id where ep.status='draft' and ep.review_notes is not null
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_printed','urgent',ep.teacher_id,'exam_papers',ep.id,format('Approved paper "%s" is still not printed for the scheduled exam.',si.title)
  from public.exam_papers ep join public.schedule_items si on si.id=ep.schedule_item_id where ep.status='approved' and coalesce(ep.print_status,'not_printed')<>'printed' and si.scheduled_date<=current_date+interval '1 day' and ep.file_path is not null
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'results_overdue','urgent',rs.teacher_id,'schedule_items',rs.schedule_item_id,format('Results for "%s" were submitted but have not been finalized within 24 hours.',si.title)
  from public.result_submissions rs join public.schedule_items si on si.id=rs.schedule_item_id where rs.status='submitted' and rs.submitted_at<now()-interval '24 hours'
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'teacher_compliance_warning','warning',p.user_id,'profiles',p.user_id,format('%s has multiple recent paper-compliance warnings.',p.full_name)
  from public.profiles p where p.role='teacher' and p.is_active and (select count(*) from public.alerts a where a.type='paper_missing' and a.teacher_id=p.user_id and a.created_at>=now()-interval '30 days')>=2
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,reference_table,reference_id,message)
  select 'class_performance_warning','critical','classes',x.class_id,format('Class pass rate is %s%% across graded tests.',x.pass_rate)
  from (select s.class_id,round(avg(case when tr.is_pass then 100.0 else 0.0 end))::int pass_rate from public.schedule_items s join public.test_results tr on tr.schedule_item_id=s.id where tr.is_absent=false and tr.is_pass is not null group by s.class_id) x
  where x.pass_rate<40 on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,reference_table,reference_id,message,recipient_id)
  select 'student_performance_warning','critical','students',x.student_id,format('Student %s has failed three consecutive graded tests.',x.student_name),p.user_id
  from (select st.id student_id,st.name student_name from public.students st join lateral(select tr.is_pass from public.test_results tr join public.schedule_items si on si.id=tr.schedule_item_id where tr.student_id=st.id and tr.is_absent=false and tr.is_pass is not null order by si.scheduled_date desc limit 3) r on true group by st.id,st.name having count(*)=3 and bool_and(r.is_pass=false)) x
  cross join lateral(select user_id from public.profiles where role='academic_coordinator' and is_active order by created_at limit 1) p
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'attendance_submission_missing',case when current_time>=time '10:00' then 'urgent' else 'warning' end,ct.teacher_id,'class_teachers',ct.id,format('First-period attendance for %s · %s has not been submitted today.',c.name,s.name)
  from public.class_teachers ct join public.classes c on c.id=ct.class_id join public.sections s on s.id=ct.section_id
  where not exists(select 1 from public.attendance_sessions a where a.class_id=ct.class_id and a.section_id=ct.section_id and a.attendance_date=current_date and a.status='submitted')
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'attendance_compliance_warning','warning',x.teacher_id,'profiles',x.teacher_id,format('%s has missed first-period attendance on %s recent class-days.',x.teacher_name,x.missed_days)
  from (select ct.teacher_id,p.full_name teacher_name,count(*)::int missed_days from public.class_teachers ct join public.profiles p on p.user_id=ct.teacher_id and p.role='teacher' and p.is_active cross join generate_series(current_date-interval '14 days',current_date,interval '1 day') d(day) where extract(isodow from d.day) between 1 and 5 and not exists(select 1 from public.attendance_sessions a where a.class_id=ct.class_id and a.section_id=ct.section_id and a.attendance_date=d.day and a.status='submitted') group by ct.teacher_id,p.full_name having count(*)>=3) x
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,reference_table,reference_id,message)
  select 'student_attendance_warning','warning','students',ass.student_id,format('Student %s (%s) has attendance at %s%%.',ass.name,ass.roll_no,ass.attendance_percentage)
  from public.attendance_student_summary ass where ass.recorded_days>=5 and ass.attendance_percentage<75
  on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,reference_table,reference_id,message)
  select 'class_attendance_warning','warning','classes',x.class_id,format('Class attendance is %s%% today.',x.attendance_percentage)
  from (select ats.class_id,round(100.0*count(*) filter(where ar.status in('present','late','excused'))/nullif(count(*),0),1) attendance_percentage from public.attendance_records ar join public.attendance_sessions ats on ats.id=ar.session_id where ats.attendance_date=current_date and ats.status='submitted' group by ats.class_id) x
  where x.attendance_percentage<85 on conflict (type,reference_id) where status='open' do nothing;
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'exam_attendance_result_exception','urgent',si.teacher_id,'schedule_items',si.id,format('%s has students present in the exam attendance roster whose results are still missing.',si.title)
  from public.schedule_items si where exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=si.id and r.missing_result_after_exam_presence)
  on conflict (type,reference_id) where status='open' do nothing;
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='paper_missing' and exists(select 1 from public.exam_papers ep where ep.schedule_item_id=a.reference_id and ep.status not in ('not_started','draft'));
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='paper_rejected' and exists(select 1 from public.exam_papers ep where ep.id=a.reference_id and ep.status='approved');
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='paper_printed' and exists(select 1 from public.exam_papers ep where ep.id=a.reference_id and ep.print_status='printed');
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='test_overdue' and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.status in ('completed','cancelled','skipped'));
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='results_missing' and not exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=a.reference_id and r.result_expected=true and r.result_id is null) and (not exists(select 1 from public.exam_attendance_sessions eas where eas.schedule_item_id=a.reference_id) or exists(select 1 from public.test_results tr where tr.schedule_item_id=a.reference_id));
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='results_overdue' and exists(select 1 from public.result_submissions rs where rs.schedule_item_id=a.reference_id and rs.status in ('reviewed','finalized'));
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='teacher_compliance_warning' and not exists(select 1 from public.alerts x where x.type='paper_missing' and x.teacher_id=a.reference_id and x.status='open');
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='class_performance_warning' and exists(select 1 from (select s.class_id,round(avg(case when tr.is_pass then 100.0 else 0.0 end))::int pass_rate from public.schedule_items s join public.test_results tr on tr.schedule_item_id=s.id where tr.is_absent=false and tr.is_pass is not null group by s.class_id) x where x.class_id=a.reference_id and x.pass_rate>=40);
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='student_performance_warning' and not exists(select 1 from (select st.id student_id from public.students st join lateral(select tr.is_pass from public.test_results tr join public.schedule_items si on si.id=tr.schedule_item_id where tr.student_id=st.id and tr.is_absent=false and tr.is_pass is not null order by si.scheduled_date desc limit 3) r on true group by st.id having count(*)=3 and bool_and(r.is_pass=false)) x where x.student_id=a.reference_id);
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='attendance_submission_missing' and exists(select 1 from public.class_teachers ct join public.attendance_sessions ats on ats.class_id=ct.class_id and ats.section_id=ct.section_id where ct.id=a.reference_id and ats.attendance_date=current_date and ats.status='submitted');
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='student_attendance_warning' and exists(select 1 from public.attendance_student_summary ass where ass.student_id=a.reference_id and ass.attendance_percentage>=75);
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='class_attendance_warning' and exists(select 1 from (select ats.class_id,round(100.0*count(*) filter(where ar.status in('present','late','excused'))/nullif(count(*),0),1) attendance_percentage from public.attendance_records ar join public.attendance_sessions ats on ats.id=ar.session_id where ats.attendance_date=current_date and ats.status='submitted' group by ats.class_id) x where x.class_id=a.reference_id and x.attendance_percentage>=85);
  update public.alerts a set status='resolved',resolved_at=now(),resolved_by=null where a.status='open' and a.type='exam_attendance_result_exception' and not exists(select 1 from public.exam_attendance_reconciliation r where r.schedule_item_id=a.reference_id and r.missing_result_after_exam_presence);
end;
$$;
revoke execute on function public.scan_examination_compliance() from public,anon,authenticated;
