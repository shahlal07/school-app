-- Found via live end-to-end testing: mark_exam_paper_printed() inserts two
-- open alerts for the same (type='paper_printed', reference_id=job_id) - one
-- for the teacher, one for the coordinator - which always violates
-- uq_alerts_open_dedup (type, reference_id) WHERE status='open' whenever a
-- coordinator exists and differs from the teacher (the normal case). This
-- meant marking any real paper as printed would always fail with a
-- duplicate-key error - the print workflow's final step was completely
-- broken. An index-widening approach was tried and reverted (see the two
-- preceding migrations): it broke scan_examination_compliance()'s ON
-- CONFLICT clauses and would have let NULL-recipient scanner alerts
-- duplicate on every run.
--
-- Real fix, at the function level: match the scanner's own established
-- defensive pattern - "on conflict (type, reference_id) where status='open'
-- do nothing" on both inserts. The coordinator-targeted insert simply no-ops
-- if the teacher-targeted one already claimed that slot; the coordinator
-- still sees the underlying alert via alerts_select's can_view_school_wide()
-- clause regardless; the teacher's own copy is unaffected either way.
-- Verified live end-to-end after this fix: queue -> print -> exactly one
-- alert row created, no error, coordinator retains visibility via
-- can_view_school_wide().
create or replace function public.mark_exam_paper_printed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_job public.exam_paper_print_jobs%rowtype;
  v_paper public.exam_papers%rowtype;
  v_coordinator uuid;
begin
  if auth.uid() is null or not public.is_clerk() then
    raise exception 'Only an authenticated clerk can mark a paper printed.';
  end if;
  select * into v_job from public.exam_paper_print_jobs where id=p_job_id for update;
  if not found then raise exception 'Print job not found.'; end if;
  if v_job.status <> 'queued' then raise exception 'Only queued print jobs can be marked printed.'; end if;
  select * into v_paper from public.exam_papers where id=v_job.exam_paper_id for update;
  if not found then raise exception 'Exam paper not found.'; end if;
  if v_paper.status <> 'approved' then raise exception 'Only approved papers can be printed.'; end if;

  update public.exam_paper_print_jobs
  set status='printed', printed_by=auth.uid(), printed_at=now()
  where id=p_job_id;
  if v_job.exam_paper_version_id is not null then
    update public.exam_paper_versions set status='printed' where id=v_job.exam_paper_version_id;
  end if;
  update public.exam_papers
  set print_status='printed', printed_by=auth.uid(), printed_at=now(), updated_at=now()
  where id=v_paper.id;

  select p.user_id into v_coordinator
  from public.profiles p
  where p.role='academic_coordinator' and p.is_active=true
  order by p.created_at asc limit 1;

  insert into public.alerts(type,severity,teacher_id,recipient_id,reference_table,reference_id,message)
  values('paper_printed','info',v_paper.teacher_id,v_paper.teacher_id,'exam_paper_print_jobs',v_job.id,
         format('Exam paper was printed (%s cop%s).', v_job.copies, case when v_job.copies=1 then 'y' else 'ies' end))
  on conflict (type, reference_id) where status='open' do nothing;
  if v_coordinator is not null and v_coordinator <> v_paper.teacher_id then
    insert into public.alerts(type,severity,teacher_id,recipient_id,reference_table,reference_id,message)
    values('paper_printed','info',v_paper.teacher_id,v_coordinator,'exam_paper_print_jobs',v_job.id,
           'An exam paper assigned to a teacher was printed.')
    on conflict (type, reference_id) where status='open' do nothing;
  end if;
end;
$function$;
