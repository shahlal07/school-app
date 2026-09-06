create or replace function public.mark_exam_paper_printed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.exam_paper_print_jobs%rowtype;
  v_paper public.exam_papers%rowtype;
  v_coordinator uuid;
begin
  if auth.uid() is null or not public.is_clerk() then
    raise exception 'Only an authenticated clerk can mark a paper printed.';
  end if;

  select * into v_job from public.exam_paper_print_jobs where id = p_job_id for update;
  if not found then raise exception 'Print job not found.'; end if;
  if v_job.status <> 'queued' then raise exception 'Only queued print jobs can be marked printed.'; end if;

  select * into v_paper from public.exam_papers where id = v_job.exam_paper_id;
  if not found then raise exception 'Exam paper not found.'; end if;

  update public.exam_paper_print_jobs
  set status = 'printed', printed_by = auth.uid(), printed_at = now()
  where id = p_job_id;

  select p.user_id into v_coordinator
  from public.profiles p
  where p.role = 'academic_coordinator' and p.is_active = true
  order by p.created_at asc
  limit 1;

  insert into public.alerts (type, severity, teacher_id, recipient_id, reference_table, reference_id, message)
  values ('paper_printed', 'info', v_paper.teacher_id, v_paper.teacher_id,
    'exam_paper_print_jobs', v_job.id,
    format('Exam paper was printed at %s.', to_char(now(), 'DD Mon YYYY HH12:MI AM')));

  if v_coordinator is not null and v_coordinator <> v_paper.teacher_id then
    insert into public.alerts (type, severity, teacher_id, recipient_id, reference_table, reference_id, message)
    values ('paper_printed', 'info', v_paper.teacher_id, v_coordinator,
      'exam_paper_print_jobs', v_job.id,
      format('Exam paper for teacher %s was printed at %s.', v_paper.teacher_id::text, to_char(now(), 'DD Mon YYYY HH12:MI AM')));
  end if;
end;
$$;
revoke execute on function public.mark_exam_paper_printed(uuid) from public;
revoke execute on function public.mark_exam_paper_printed(uuid) from anon;
grant execute on function public.mark_exam_paper_printed(uuid) to authenticated;
