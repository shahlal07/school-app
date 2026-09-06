-- Print workflow: teacher uploads an exam paper file (exam_papers.file_path
-- already existed but was never wired to any UI/RLS beyond the uploading
-- teacher and owner) -> clerk and coordinator can see it -> clerk queues it
-- for printing -> clerk marks it printed, which notifies the teacher and
-- coordinator via the existing alerts mechanism (alerts_select already
-- shows a teacher their own alerts and shows coordinator/principal/owner
-- everything via can_view_school_wide()).
--
-- NOTE: the exam_papers_select / exam_papers_storage_select policy bodies
-- set here were later superseded by a broader version from concurrent work
-- on this same feature (clerk given unconditional visibility rather than
-- gated on file_path is not null) - see later migrations. The print_status/
-- print_requested_at/printed_at/printed_by columns and the alerts_type_check
-- addition below remained in active use by that later, more complete
-- print-job system (exam_paper_print_jobs table).

-- ============================================================
-- 1. Print-status tracking columns on exam_papers
-- ============================================================
alter table public.exam_papers add column if not exists print_status text not null default 'not_requested'
  check (print_status in ('not_requested', 'queued', 'printed'));
alter table public.exam_papers add column if not exists print_requested_at timestamptz;
alter table public.exam_papers add column if not exists printed_at timestamptz;
alter table public.exam_papers add column if not exists printed_by uuid references public.profiles(user_id);

-- ============================================================
-- 2. exam_papers_select: clerk can see uploaded papers (file_path set) -
--    printing is a records/logistics job, scoped to only papers that
--    actually have something to print. Existing owner/can_view_school_wide/
--    own-teacher clauses preserved verbatim.
-- ============================================================
alter policy exam_papers_select on public.exam_papers
  using (is_owner() or can_view_school_wide() or (teacher_id = (select auth.uid())) or (is_clerk() and file_path is not null));

-- ============================================================
-- 3. Storage: exam-papers bucket objects need to be readable by clerk and
--    coordinator/principal too (previously only the uploading teacher's own
--    folder or owner). Preserves the existing owner/own-folder clauses.
-- ============================================================
alter policy exam_papers_storage_select on storage.objects
  using (
    bucket_id = 'exam-papers' and (
      is_owner()
      or can_view_school_wide()
      or is_clerk()
      or (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

-- ============================================================
-- 4. Scoped RPCs for the print workflow (later dropped in favor of a more
--    complete concurrently-built system - see
--    drop_redundant_simple_print_rpcs migration).
-- ============================================================
create function public.queue_paper_for_printing(p_paper_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_owner() or public.is_clerk()) then
    raise exception 'insufficient_privilege';
  end if;

  update public.exam_papers
  set print_status = 'queued',
      print_requested_at = now(),
      updated_at = now()
  where id = p_paper_id and file_path is not null;
end;
$$;

create function public.mark_paper_printed(p_paper_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_title text;
begin
  if not (public.is_owner() or public.is_clerk()) then
    raise exception 'insufficient_privilege';
  end if;

  update public.exam_papers
  set print_status = 'printed',
      printed_at = now(),
      printed_by = auth.uid(),
      updated_at = now()
  where id = p_paper_id
  returning teacher_id into v_teacher_id;

  if v_teacher_id is null then
    return;
  end if;

  select si.title into v_title
  from public.schedule_items si
  join public.exam_papers ep on ep.schedule_item_id = si.id
  where ep.id = p_paper_id;

  insert into public.alerts (type, severity, teacher_id, reference_table, reference_id, message, status)
  values (
    'paper_printed',
    'info',
    v_teacher_id,
    'exam_papers',
    p_paper_id,
    coalesce('Exam paper "' || v_title || '" has been printed and is ready.', 'An exam paper has been printed and is ready.'),
    'open'
  );
end;
$$;

revoke execute on function public.queue_paper_for_printing(uuid) from public, anon;
revoke execute on function public.mark_paper_printed(uuid) from public, anon;
grant execute on function public.queue_paper_for_printing(uuid) to authenticated;
grant execute on function public.mark_paper_printed(uuid) to authenticated;
