-- Reprints are new queued jobs linked to the original printed job, preserving audit history.
create or replace function public.create_exam_paper_reprint_job(
  p_job_id uuid,
  p_copies integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.exam_paper_print_jobs%rowtype;
  v_paper public.exam_papers%rowtype;
begin
  if auth.uid() is null or not public.is_clerk() then raise exception 'Only an authenticated clerk can create a reprint.'; end if;
  if p_copies is null or p_copies < 1 or p_copies > 10000 then raise exception 'Copies must be between 1 and 10000.'; end if;
  if pg_catalog.length(pg_catalog.btrim(coalesce(p_reason,''))) < 3 then raise exception 'A reprint reason is required.'; end if;
  select * into v_job from public.exam_paper_print_jobs where id=p_job_id;
  if not found then raise exception 'Print job not found.'; end if;
  if v_job.status <> 'printed' then raise exception 'Only printed jobs can be reprinted.'; end if;
  select * into v_paper from public.exam_papers where id=v_job.exam_paper_id;
  if not found then raise exception 'Exam paper not found.'; end if;
  if v_paper.status <> 'approved' then raise exception 'Only approved papers can be reprinted.'; end if;
  insert into public.exam_paper_print_jobs(
    exam_paper_id, exam_paper_version_id, queued_by, queued_at, copies, color_mode, duplex, page_count, priority, status, reprint_of_job_id, reprint_reason, notes
  ) values (
    v_job.exam_paper_id, v_job.exam_paper_version_id, auth.uid(), pg_catalog.now(), p_copies, v_job.color_mode, v_job.duplex, v_job.page_count, v_job.priority, 'queued', v_job.id, pg_catalog.btrim(p_reason), 'Reprint request'
  );
  update public.exam_papers set print_status='queued', print_requested_at=pg_catalog.now(), updated_at=pg_catalog.now() where id=v_paper.id;
end;
$$;
revoke execute on function public.create_exam_paper_reprint_job(uuid, integer, text) from public, anon;
grant execute on function public.create_exam_paper_reprint_job(uuid, integer, text) to authenticated;
