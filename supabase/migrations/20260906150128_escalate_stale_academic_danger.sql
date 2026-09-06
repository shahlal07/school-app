create or replace function public.scan_examination_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $function$
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
  select 'results_missing','warning',ts.teacher_id,'schedule_items',si.id,format('Results for "%s" have not been entered yet.',si.title)
  from public.schedule_items si join public.teacher_subjects ts on ts.subject_id=si.subject_id
  where si.status='completed' and not exists(select 1 from public.test_results tr where tr.schedule_item_id=si.id)
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_rejected','high',ep.teacher_id,'exam_papers',ep.id,format('Exam paper "%s" is awaiting a correction after rejection.',si.title)
  from public.exam_papers ep join public.schedule_items si on si.id=ep.schedule_item_id
  where ep.status='draft' and ep.review_notes is not null and not exists(select 1 from public.alerts a where a.type='paper_rejected' and a.reference_id=ep.id and a.status='open')
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'paper_printed','critical',ep.teacher_id,'exam_papers',ep.id,format('Approved paper "%s" is still not printed for the scheduled exam.',si.title)
  from public.exam_papers ep join public.schedule_items si on si.id=ep.schedule_item_id
  where ep.status='approved' and coalesce(ep.print_status,'not_printed')<>'printed' and si.scheduled_date<=current_date+interval '1 day' and ep.file_path is not null
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'results_overdue','urgent',rs.teacher_id,'schedule_items',rs.schedule_item_id,format('Results for "%s" were submitted but have not been finalized within 24 hours.',si.title)
  from public.result_submissions rs join public.schedule_items si on si.id=rs.schedule_item_id
  where rs.status='submitted' and rs.submitted_at<now()-interval '24 hours'
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'teacher_compliance_warning','high',ts.teacher_id,'profiles',ts.teacher_id,format('%s has multiple recent paper-compliance warnings.',coalesce(p.full_name,'Teacher'))
  from public.profiles p join public.teacher_subjects ts on ts.teacher_id=p.user_id
  where p.role='teacher' and p.is_active
    and (select count(*) from public.alerts a where a.type='paper_missing' and a.teacher_id=p.user_id and a.created_at>=now()-interval '30 days')>=2
  group by ts.teacher_id,p.full_name
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'class_performance_warning','critical',null,'classes',x.class_id,format('Class pass rate is %s%% across graded tests.',x.pass_rate)
  from (
    select s.class_id,round(avg(case when tr.is_pass then 100.0 else 0.0 end))::int pass_rate
    from public.schedule_items s join public.test_results tr on tr.schedule_item_id=s.id
    where tr.is_absent=false and tr.is_pass is not null group by s.class_id
  ) x where x.pass_rate<40
  on conflict (type,reference_id) where status='open' do nothing;

  insert into public.alerts(type,severity,teacher_id,recipient_id,reference_table,reference_id,message)
  select 'student_performance_warning','critical',null,p.user_id,'students',x.student_id,format('Student %s has failed three consecutive graded tests.',x.student_name)
  from (
    select st.id student_id,st.name student_name
    from public.students st join lateral (
      select tr.is_pass from public.test_results tr join public.schedule_items si on si.id=tr.schedule_item_id where tr.student_id=st.id and tr.is_absent=false and tr.is_pass is not null order by si.scheduled_date desc limit 3
    ) r on true group by st.id,st.name having count(*)=3 and bool_and(r.is_pass=false)
  ) x cross join lateral (select user_id from public.profiles where role='academic_coordinator' and is_active order by created_at limit 1) p
  on conflict (type,reference_id) where status='open' do nothing;

  update public.alerts a
  set severity='critical', recipient_id=(select user_id from public.profiles where role='principal' and is_active order by created_at limit 1)
  where a.status='open' and a.type='paper_missing'
    and a.reference_table='schedule_items'
    and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.scheduled_date<=current_date-interval '3 days')
    and exists(select 1 from public.profiles where role='principal' and is_active);

  update public.alerts a
  set severity='critical', recipient_id=(select user_id from public.profiles where role='principal' and is_active order by created_at limit 1)
  where a.status='open' and a.type='test_overdue'
    and a.reference_table='schedule_items'
    and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.scheduled_date<=current_date-interval '3 days')
    and exists(select 1 from public.profiles where role='principal' and is_active);

  update public.alerts a
  set severity='critical', recipient_id=(select user_id from public.profiles where role='principal' and is_active order by created_at limit 1)
  where a.status='open' and a.type='results_overdue'
    and a.created_at<=now()-interval '48 hours'
    and exists(select 1 from public.profiles where role='principal' and is_active);

  update public.alerts a set status='resolved',resolved_at=now()
  where a.status='open' and a.type='paper_missing' and ((a.reference_table='schedule_items' and exists(select 1 from public.exam_papers ep where ep.schedule_item_id=a.reference_id and ep.status not in ('not_started','draft'))) or (a.reference_table='exam_papers' and exists(select 1 from public.exam_papers ep where ep.id=a.reference_id and ep.print_status='printed')));
  update public.alerts a set status='resolved',resolved_at=now() where a.type='test_overdue' and a.status='open' and exists(select 1 from public.schedule_items si where si.id=a.reference_id and si.status in ('completed','cancelled','skipped'));
  update public.alerts a set status='resolved',resolved_at=now() where a.type='results_missing' and a.status='open' and exists(select 1 from public.test_results tr where tr.schedule_item_id=a.reference_id);
  update public.alerts a set status='resolved',resolved_at=now() where a.type='results_overdue' and a.status='open' and exists(select 1 from public.result_submissions rs where rs.schedule_item_id=a.reference_id and rs.status in ('reviewed','finalized'));
  update public.alerts a set status='resolved',resolved_at=now() where a.type='paper_rejected' and a.status='open' and exists(select 1 from public.exam_papers ep where ep.id=a.reference_id and ep.status='approved');
end;
$function$;

revoke execute on function public.scan_examination_compliance() from public, anon, authenticated;
