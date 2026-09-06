-- Exam workflow hardening: immutable paper versions and controlled print specifications.
-- Existing exam_papers rows are backfilled as version 1.

alter table public.exam_papers
  add column if not exists current_version integer not null default 1;

create table if not exists public.exam_paper_versions (
  id uuid primary key default gen_random_uuid(),
  exam_paper_id uuid not null references public.exam_papers(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  file_path text,
  content text,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  submission_note text,
  status text not null default 'submitted'
    check (status in ('draft','submitted','under_review','approved','rejected','printed')),
  unique (exam_paper_id, version_number)
);

create index if not exists idx_exam_paper_versions_paper
  on public.exam_paper_versions(exam_paper_id, version_number desc);

insert into public.exam_paper_versions (
  exam_paper_id, version_number, file_path, content, created_by, created_at, status
)
select
  ep.id,
  1,
  ep.file_path,
  ep.content,
  ep.teacher_id,
  ep.created_at,
  case
    when ep.status = 'approved' then 'approved'
    when ep.status = 'draft' then 'draft'
    else 'submitted'
  end
from public.exam_papers ep
where not exists (
  select 1
  from public.exam_paper_versions v
  where v.exam_paper_id = ep.id
    and v.version_number = 1
);

alter table public.exam_paper_print_jobs
  add column if not exists exam_paper_version_id uuid references public.exam_paper_versions(id),
  add column if not exists copies integer not null default 1,
  add column if not exists color_mode text not null default 'bw',
  add column if not exists duplex boolean not null default true,
  add column if not exists page_count integer,
  add column if not exists priority text not null default 'normal',
  add column if not exists reprint_of_job_id uuid references public.exam_paper_print_jobs(id),
  add column if not exists reprint_reason text;

update public.exam_paper_print_jobs j
set exam_paper_version_id = v.id
from public.exam_paper_versions v
where j.exam_paper_version_id is null
  and v.exam_paper_id = j.exam_paper_id
  and v.version_number = 1;

alter table public.exam_paper_versions enable row level security;

drop policy if exists exam_paper_versions_select on public.exam_paper_versions;
drop policy if exists exam_paper_versions_insert on public.exam_paper_versions;
drop policy if exists exam_paper_versions_update on public.exam_paper_versions;
drop policy if exists exam_paper_versions_delete on public.exam_paper_versions;

create policy exam_paper_versions_select on public.exam_paper_versions
  for select using (
    public.is_owner()
    or public.can_view_school_wide()
    or public.is_clerk()
    or exists (
      select 1 from public.exam_papers ep
      where ep.id = exam_paper_versions.exam_paper_id
        and ep.teacher_id = (select auth.uid())
    )
  );

create policy exam_paper_versions_insert on public.exam_paper_versions
  for insert with check (
    public.is_owner()
    or public.can_manage_academics()
    or (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.exam_papers ep
        where ep.id = exam_paper_versions.exam_paper_id
          and ep.teacher_id = (select auth.uid())
      )
    )
  );

create policy exam_paper_versions_update on public.exam_paper_versions
  for update using (public.is_owner() or public.can_manage_academics())
  with check (public.is_owner() or public.can_manage_academics());

create policy exam_paper_versions_delete on public.exam_paper_versions
  for delete using (public.is_owner());
