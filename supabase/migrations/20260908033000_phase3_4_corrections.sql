-- Phase 3/4 corrections discovered during live-schema verification.
-- schedule_items.teacher_id can be null in existing exam schedules; resolve the owning teacher
-- through the existing teacher_subjects mapping rather than inventing a new relationship.

revoke all on public.student_documents from anon;
revoke all on public.admissions from anon;
revoke all on public.fee_records from anon;
grant select, insert, update, delete on public.student_documents to authenticated;
grant select, insert, update, delete on public.admissions to authenticated;
grant select, insert, update, delete on public.fee_records to authenticated;

create or replace function public.mark_paper_handed_to_clerk(p_schedule_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_teacher uuid;
  v_paper uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select coalesce(si.teacher_id, ts.teacher_id)
    into v_teacher
  from public.schedule_items si
  left join lateral (
    select teacher_id
    from public.teacher_subjects
    where subject_id = si.subject_id
    order by teacher_id
    limit 1
  ) ts on true
  where si.id = p_schedule_item_id;

  if v_teacher is null or v_teacher <> v_user then
    raise exception 'not_authorized';
  end if;

  select id into v_paper
  from public.exam_papers
  where schedule_item_id = p_schedule_item_id
  for update;

  if v_paper is null then
    insert into public.exam_papers(schedule_item_id, teacher_id, status)
    values (p_schedule_item_id, v_teacher, 'draft')
    returning id into v_paper;
  end if;

  update public.exam_papers
  set handed_to_clerk_at = coalesce(handed_to_clerk_at, now()),
      handed_to_clerk_by = coalesce(handed_to_clerk_by, v_user),
      updated_at = now()
  where id = v_paper;

  update public.alerts
  set status = 'resolved', resolved_at = now(), resolved_by = v_user
  where status = 'open'
    and type = 'paper_handoff_reminder'
    and reference_id = p_schedule_item_id;
end;
$$;
revoke execute on function public.mark_paper_handed_to_clerk(uuid) from public, anon;
grant execute on function public.mark_paper_handed_to_clerk(uuid) to authenticated;

create or replace function public.clerk_upload_test_results(
  p_schedule_item_id uuid,
  p_total_marks int,
  p_results jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_class uuid;
  v_expected int;
  v_count int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.is_clerk() then raise exception 'not_authorized'; end if;
  if p_total_marks is null or p_total_marks <= 0 then raise exception 'invalid_total_marks'; end if;
  if jsonb_typeof(p_results) <> 'array' then raise exception 'invalid_results_payload'; end if;

  select class_id into v_class
  from public.schedule_items
  where id = p_schedule_item_id;

  if v_class is null then raise exception 'schedule_not_found'; end if;

  -- Exam results in the existing School OS schema are class-scoped; schedule_items
  -- has no section_id, so do not invent a section boundary here.
  select count(*) into v_expected
  from public.students
  where class_id = v_class and is_active = true;

  select count(*) into v_count from jsonb_array_elements(p_results);
  if v_count <> v_expected then raise exception 'roster_mismatch'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_results) r
    where not exists (
      select 1 from public.students s
      where s.id = (r->>'student_id')::uuid
        and s.class_id = v_class
        and s.is_active = true
    )
    or (
      coalesce((r->>'is_absent')::boolean, false) = false
      and ((r->>'marks_obtained') is null
        or (r->>'marks_obtained')::numeric < 0
        or (r->>'marks_obtained')::numeric > p_total_marks)
    )
  ) then
    raise exception 'invalid_roster_submission';
  end if;

  insert into public.test_results(
    schedule_item_id, student_id, marks_obtained, total_marks,
    is_absent, remarks, entered_by, entered_at, entered_by_clerk
  )
  select
    p_schedule_item_id,
    (r->>'student_id')::uuid,
    case when coalesce((r->>'is_absent')::boolean, false)
         then null else (r->>'marks_obtained')::numeric end,
    p_total_marks,
    coalesce((r->>'is_absent')::boolean, false),
    nullif(r->>'remarks', ''),
    v_user, now(), true
  from jsonb_array_elements(p_results) r
  on conflict (schedule_item_id, student_id) do update
    set marks_obtained = excluded.marks_obtained,
        total_marks = excluded.total_marks,
        is_absent = excluded.is_absent,
        remarks = excluded.remarks,
        entered_by = excluded.entered_by,
        entered_at = excluded.entered_at,
        entered_by_clerk = true;
end;
$$;
revoke execute on function public.clerk_upload_test_results(uuid, int, jsonb) from public, anon;
grant execute on function public.clerk_upload_test_results(uuid, int, jsonb) to authenticated;

-- Keep one hourly cron job, but make its command invoke both existing compliance
-- scanning and the new delegation scan.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'scan-examination-compliance' limit 1),
  null,
  'select public.scan_examination_compliance(); select public.scan_exam_delegation_alerts();',
  null, null, null
);
