-- Harden the database boundary: a teacher may not mutate a submitted/approved/printed paper.
create or replace function public.enforce_exam_paper_review_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_academics() and not public.is_owner() then
    if new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.review_notes is distinct from old.review_notes then
      raise exception 'Only an owner or academic coordinator can set paper review fields.';
    end if;
    if old.status not in ('not_started','draft') then
      if new.status is distinct from old.status
        or new.content is distinct from old.content
        or new.file_path is distinct from old.file_path
        or new.current_version is distinct from old.current_version
        or new.teacher_id is distinct from old.teacher_id
        or new.schedule_item_id is distinct from old.schedule_item_id then
        raise exception 'Submitted exam papers are immutable. Revise by creating a new version.';
      end if;
    elsif new.status is distinct from old.status
      and new.status not in ('not_started','draft','submitted') then
      raise exception 'Only an owner or academic coordinator can advance a paper past submission.';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_exam_paper_review_fields() from public, anon, authenticated;
grant execute on function public.enforce_exam_paper_review_fields() to postgres;

drop policy if exists exam_paper_print_jobs_insert on public.exam_paper_print_jobs;
create policy exam_paper_print_jobs_insert on public.exam_paper_print_jobs
  for insert with check (
    public.is_clerk()
    and queued_by = (select auth.uid())
    and status = 'queued'
    and copies between 1 and 10000
    and color_mode in ('bw','color')
    and priority in ('low','normal','high','urgent')
    and exists (
      select 1
      from public.exam_papers ep
      join public.exam_paper_versions v on v.exam_paper_id = ep.id and v.id = exam_paper_print_jobs.exam_paper_version_id
      where ep.id = exam_paper_print_jobs.exam_paper_id
        and ep.status = 'approved'
        and ep.file_path is not null
        and v.version_number = ep.current_version
        and v.status = 'approved'
    )
  );

alter table public.exam_paper_print_jobs
  drop constraint if exists exam_paper_print_jobs_copies_check,
  drop constraint if exists exam_paper_print_jobs_color_mode_check,
  drop constraint if exists exam_paper_print_jobs_priority_check;

alter table public.exam_paper_print_jobs
  add constraint exam_paper_print_jobs_copies_check check (copies between 1 and 10000),
  add constraint exam_paper_print_jobs_color_mode_check check (color_mode in ('bw','color')),
  add constraint exam_paper_print_jobs_priority_check check (priority in ('low','normal','high','urgent'));

-- Revisions use unique uploads, so direct object replacement/deletion by teachers is unnecessary.
drop policy if exists exam_papers_storage_update on storage.objects;
drop policy if exists exam_papers_storage_delete on storage.objects;
