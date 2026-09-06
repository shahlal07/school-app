-- Phase C of the Continuous Exam Set model: automatic scheduling.

-- Collision protection (spec: "two subjects from the same class on the same
-- date when not explicitly supported"). Nothing currently violates this
-- (verified before adding), and it protects both the older per-subject
-- schedule generator and the new exam-set generator below.
create unique index schedule_items_class_date_unique
  on public.schedule_items(class_id, scheduled_date)
  where status <> 'cancelled';

-- Generates one new exam set for a class: one schedule_items row per active
-- subject (ordered by subjects.order_index, then name), placed on
-- consecutive eligible exam days per the Phase A calendar resolver, with a
-- matching exam_set_subjects row linking each slot back to its
-- schedule_item. Topic/chapter selection within each slot is left for the
-- coordinator/clerk to fill in afterward (per the product spec, syllabus/
-- topic selection stays their call, not auto-decided here).
create or replace function public.generate_exam_set(p_class_id uuid, p_start_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set_id uuid;
  v_set_number int;
  v_scope text;
  v_cursor date;
  v_subject record;
  v_sequence int := 0;
  v_schedule_item_id uuid;
  v_class_name text;
  v_subject_count int;
  v_test_type text;
begin
  if auth.uid() is null or not (public.is_owner() or public.is_academic_coordinator()) then
    raise exception 'Only the academic coordinator or owner can generate an exam set.';
  end if;

  if exists (
    select 1 from public.exam_sets
    where class_id = p_class_id and status in ('planned','active','awaiting_completion')
  ) then
    raise exception 'This class already has an exam set in progress. Complete or cancel it before starting a new one.';
  end if;

  select count(*) into v_subject_count from public.subjects where class_id = p_class_id and is_active = true;
  if v_subject_count = 0 then
    raise exception 'This class has no active subjects to schedule.';
  end if;

  select name into v_class_name from public.classes where id = p_class_id;
  if v_class_name is null then raise exception 'Class not found.'; end if;

  select coalesce(max(set_number), 0) + 1 into v_set_number from public.exam_sets where class_id = p_class_id;

  select assessment_scope into v_scope from public.exam_sets
    where class_id = p_class_id order by set_number desc limit 1;
  v_scope := coalesce(v_scope, 'topic');
  v_test_type := case v_scope
    when 'topic' then 'topic'
    when 'half_chapter' then 'chapter'
    when 'chapter' then 'chapter'
    when 'chapter_plus_half' then 'chapter'
    when 'multi_chapter' then 'terminal'
    when 'full_syllabus' then 'final'
    else 'custom'
  end;

  v_cursor := coalesce(p_start_date, current_date);
  if not public.is_eligible_exam_day(v_cursor) then
    v_cursor := public.next_eligible_exam_day(v_cursor - 1);
  end if;

  insert into public.exam_sets(class_id, set_number, status, assessment_scope, started_on, created_by)
  values (p_class_id, v_set_number, 'active', v_scope, v_cursor, auth.uid())
  returning id into v_set_id;

  for v_subject in
    select id, name from public.subjects
    where class_id = p_class_id and is_active = true
    order by order_index, name
  loop
    v_sequence := v_sequence + 1;

    insert into public.schedule_items(class_id, subject_id, test_type, status, scheduled_date, title)
    values (p_class_id, v_subject.id, v_test_type, 'scheduled', v_cursor,
            format('%s - Set %s', v_subject.name, v_set_number))
    returning id into v_schedule_item_id;

    insert into public.exam_set_subjects(exam_set_id, subject_id, sequence, scheduled_date, schedule_item_id, assessment_scope)
    values (v_set_id, v_subject.id, v_sequence, v_cursor, v_schedule_item_id, v_scope);

    v_cursor := public.next_eligible_exam_day(v_cursor);
  end loop;

  return v_set_id;
end;
$$;

-- Called after a schedule_item flips to 'completed' (currently only happens
-- when reviewResultSubmission finalizes its result). If every subject slot
-- in the owning exam set is now completed, the set itself completes.
create or replace function public.check_and_complete_exam_set(p_schedule_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set_id uuid;
  v_all_done boolean;
  v_last_date date;
begin
  select exam_set_id into v_set_id from public.exam_set_subjects where schedule_item_id = p_schedule_item_id;
  if v_set_id is null then return; end if;

  select bool_and(si.status = 'completed'), max(ess.scheduled_date)
    into v_all_done, v_last_date
  from public.exam_set_subjects ess
  join public.schedule_items si on si.id = ess.schedule_item_id
  where ess.exam_set_id = v_set_id;

  if v_all_done then
    update public.exam_sets
    set status = 'completed', completed_on = v_last_date, finalized_at = now(), updated_at = now()
    where id = v_set_id and status <> 'completed';
  end if;
end;
$$;

revoke all on function public.generate_exam_set(uuid, date) from public, anon;
revoke all on function public.check_and_complete_exam_set(uuid) from public, anon;
grant execute on function public.generate_exam_set(uuid, date) to authenticated;
grant execute on function public.check_and_complete_exam_set(uuid) to authenticated;
