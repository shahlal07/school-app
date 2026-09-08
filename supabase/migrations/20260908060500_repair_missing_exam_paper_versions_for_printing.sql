-- Repair legacy exam_papers rows that have a current_version pointer but no matching version row.
insert into public.exam_paper_versions (
  exam_paper_id, version_number, file_path, content, created_by, created_at, status
)
select
  ep.id,
  ep.current_version,
  ep.file_path,
  ep.content,
  ep.teacher_id,
  coalesce(ep.submitted_at, ep.created_at, pg_catalog.now()),
  case
    when ep.status = 'approved' then 'approved'
    when ep.status = 'draft' then 'draft'
    when ep.status = 'under_review' then 'under_review'
    else 'submitted'
  end
from public.exam_papers ep
where not exists (
  select 1
  from public.exam_paper_versions v
  where v.exam_paper_id = ep.id
    and v.version_number = ep.current_version
);

-- Repair stale active-version pointers while preserving the version history.
update public.exam_papers ep
set current_version = (
  select max(v.version_number)
  from public.exam_paper_versions v
  where v.exam_paper_id = ep.id
),
updated_at = pg_catalog.now()
where exists (
  select 1 from public.exam_paper_versions v where v.exam_paper_id = ep.id
)
and ep.current_version <> (
  select max(v.version_number)
  from public.exam_paper_versions v
  where v.exam_paper_id = ep.id
);
