-- Phase 4: exam paper workflow (state machine + Storage).
--
-- One exam_papers row per schedule_item (unique constraint). A teacher can
-- move a paper through not_started -> draft -> submitted themselves; only
-- the owner can advance it past that (under_review/approved/conducted/
-- results_pending/completed) or touch the review_* fields - enforced by a
-- trigger, the same pattern as the profiles privilege-escalation guard.

create table public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null unique references public.schedule_items (id) on delete cascade,
  teacher_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'not_started' check (
    status in (
      'not_started', 'draft', 'submitted', 'under_review',
      'approved', 'conducted', 'results_pending', 'completed'
    )
  ),
  content text,
  file_path text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (user_id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exam_papers_teacher on public.exam_papers (teacher_id);
create index idx_exam_papers_status on public.exam_papers (status);

alter table public.exam_papers enable row level security;

create policy exam_papers_select on public.exam_papers
  for select using (public.is_owner() or teacher_id = auth.uid());

create policy exam_papers_insert on public.exam_papers
  for insert with check (
    public.is_owner()
    or (
      teacher_id = auth.uid()
      and exists (
        select 1 from public.schedule_items si
        join public.teacher_subjects ts on ts.subject_id = si.subject_id
        where si.id = schedule_item_id and ts.teacher_id = auth.uid()
      )
    )
  );

create policy exam_papers_update on public.exam_papers
  for update using (public.is_owner() or teacher_id = auth.uid());

create policy exam_papers_delete_owner_only on public.exam_papers
  for delete using (public.is_owner());

create or replace function public.enforce_exam_paper_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    if new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.review_notes is distinct from old.review_notes then
      raise exception 'Only an owner can set paper review fields.';
    end if;
    if new.status is distinct from old.status
      and new.status not in ('not_started', 'draft', 'submitted') then
      raise exception 'Only an owner can advance a paper past submission.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_exam_paper_review_fields
before update on public.exam_papers
for each row execute function public.enforce_exam_paper_review_fields();

revoke execute on function public.enforce_exam_paper_review_fields() from public;
revoke execute on function public.enforce_exam_paper_review_fields() from anon;
revoke execute on function public.enforce_exam_paper_review_fields() from authenticated;

-- ---------------------------------------------------------------------
-- Storage: a private bucket for uploaded papers, path convention
-- "<teacher_user_id>/<schedule_item_id>/<filename>" so RLS can scope by
-- the first path segment without needing to look up teacher_subjects
-- again inside a storage policy.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('exam-papers', 'exam-papers', false);

create policy exam_papers_storage_select on storage.objects
  for select using (
    bucket_id = 'exam-papers'
    and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy exam_papers_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'exam-papers'
    and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy exam_papers_storage_update on storage.objects
  for update using (
    bucket_id = 'exam-papers'
    and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy exam_papers_storage_delete on storage.objects
  for delete using (
    bucket_id = 'exam-papers'
    and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text)
  );
