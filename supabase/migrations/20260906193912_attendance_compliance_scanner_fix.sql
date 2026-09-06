create or replace function public.scan_examination_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.alerts(type,severity,teacher_id,reference_table,reference_id,message)
  select 'attendance_compliance_warning','warning',x.teacher_id,'profiles',x.teacher_id,
         format('%s has missed first-period attendance on %s recent class-days.',x.teacher_name,x.missed_days)
  from (
    select ct.teacher_id,p.full_name teacher_name,count(*)::int missed_days
    from public.class_teachers ct
    join public.profiles p on p.user_id=ct.teacher_id and p.role='teacher' and p.is_active
    cross join generate_series(current_date-interval '14 days',current_date,interval '1 day') d(day)
    where extract(isodow from d.day) between 1 and 5
      and not exists(select 1 from public.attendance_sessions a where a.class_id=ct.class_id and a.section_id=ct.section_id and a.attendance_date=d.day and a.status='submitted')
    group by ct.teacher_id,p.full_name
    having count(*)>=3
  ) x
  on conflict (type,reference_id) where status='open' do nothing;
end;
$$;
