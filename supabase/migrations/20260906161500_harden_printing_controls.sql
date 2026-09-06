-- Print controls are enforced in the database so the browser cannot bypass them.

drop function if exists public.queue_exam_paper_for_print(uuid);

create or replace function public.queue_exam_paper_for_print(
  p_exam_paper_id uuid,
  p_copies integer default 1,
  p_color_mode text default 'bw',
  p_duplex boolean default true,
  p_page_count integer default null,
  p_priority text default 'normal'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paper public.exam_papers%rowtype;
  v_version public.exam_paper_versions%rowtype;
begin
  if auth.uid() is null or not public.is_clerk() then
    raise exception 'Only an authenticated clerk can queue papers.';
  end if;
  if p_copies is null or p_copies < 1 or p_copies > 10000 then raise exception 'Copies must be between 1 and 10000.'; end if;
  if p_color_mode not in ('bw','color') then raise exception 'Invalid color mode.'; end if;
  if p_page_count is not null and (p_page_count < 1 or p_page_count > 10000) then raise exception 'Invalid page count.'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid print priority.'; end if;

  select * into v_paper from public.exam_papers where id = p_exam_paper_id for update;
  if not found then raise exception 'Exam paper not found.'; end if;
  if v_paper.file_path is null then raise exception 'Paper file is missing.'; end if;
  if v_paper.status <> 'approved' then raise exception 'Only coordinator-approved papers can be placed for printing.'; end if;

  select * into v_version
  from public.exam_paper_versions
  where exam_paper_id = p_exam_paper_id and version_number = v_paper.current_version;
  if not found then raise exception 'Active paper version is missing.'; end if;
  if v_version.status <> 'approved' then raise exception 'Only an approved paper version can be printed.'; end if;

  if exists (select 1 from public.exam_paper_print_jobs where exam_paper_id = p_exam_paper_id and status = 'queued') then
    raise exception 'This paper already has a queued print job.';
  end if;

  insert into public.exam_paper_print_jobs(
    exam_paper_id, exam_paper_version_id, queued_by, copies, color_mode, duplex, page_count, priority, status
  ) values (
    p_exam_paper_id, v_version.id, auth.uid(), p_copies, p_color_mode, p_duplex, p_page_count, p_priority, 'queued'
  );

  update public.exam_papers
  set print_status='queued', print_requested_at=pg_catalog.now(), updated_at=pg_catalog.now()
  where id=p_exam_paper_id;
end;
$$;

create or replace function public.mark_exam_paper_printed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  update public.exam_paper_print_jobs set status='printed',printed_by=auth.uid(),printed_at=pg_catalog.now() where id=p_job_id;
  if v_job.exam_paper_version_id is not null then
    update public.exam_paper_versions set status='printed' where id=v_job.exam_paper_version_id;
  end if;
  update public.exam_papers set print_status='printed',printed_by=auth.uid(),printed_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=v_paper.id;

  select p.user_id into v_coordinator from public.profiles p
  where p.role='academic_coordinator' and p.is_active=true order by p.created_at asc limit 1;

  insert into public.alerts(type,severity,teacher_id,recipient_id,reference_table,reference_id,message)
  values('paper_printed','info',v_paper.teacher_id,v_paper.teacher_id,'exam_paper_print_jobs',v_job.id,
         pg_catalog.format('Exam paper was printed (%s copies).', v_job.copies));
  if v_coordinator is not null and v_coordinator <> v_paper.teacher_id then
    insert into public.alerts(type,severity,teacher_id,recipient_id,reference_table,reference_id,message)
    values('paper_printed','info',v_paper.teacher_id,v_coordinator,'exam_paper_print_jobs',v_job.id,'An exam paper assigned to a teacher was printed.');
  end if;
end;
$$;

revoke execute on function public.queue_exam_paper_for_print(uuid, integer, text, boolean, integer, text) from public, anon;
grant execute on function public.queue_exam_paper_for_print(uuid, integer, text, boolean, integer, text) to authenticated;
revoke execute on function public.mark_exam_paper_printed(uuid) from public, anon;
grant execute on function public.mark_exam_paper_printed(uuid) to authenticated;
