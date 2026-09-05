-- Phase 3a: examination scheduling engine schema (algorithm only in this
-- pass - no calendar/reschedule UI yet).
--
-- Historical rows are never deleted when a schedule is regenerated or a
-- test is rescheduled - only status changes. If a chapter/topic is later
-- restructured, we preserve the schedule_item as a historical record by
-- setting chapter_id/topic_id to null rather than cascading the delete;
-- but deleting the whole subject/class is still a cascade, since there is
-- no meaningful "historical record" left without its subject/class context.

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  teacher_id uuid references public.profiles (user_id) on delete set null,
  test_type text not null check (
    test_type in ('topic', 'chapter', 'revision', 'monthly', 'midterm', 'terminal', 'final', 'custom')
  ),
  status text not null default 'upcoming' check (
    status in ('upcoming', 'draft', 'scheduled', 'completed', 'skipped', 'rescheduled', 'cancelled')
  ),
  scheduled_date date not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_schedule_items_class on public.schedule_items (class_id);
create index idx_schedule_items_subject on public.schedule_items (subject_id);
create index idx_schedule_items_teacher on public.schedule_items (teacher_id);
create index idx_schedule_items_date on public.schedule_items (scheduled_date);

alter table public.schedule_items enable row level security;

-- Owner sees/manages everything. A teacher sees only schedule items for
-- subjects they are assigned to via teacher_subjects (same scoping
-- pattern as subjects/chapters/topics). Writes are owner-only in this
-- phase - teacher-side status updates (mark complete, etc.) are a later
-- phase's concern.
create policy schedule_items_select on public.schedule_items
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.teacher_subjects ts
      where ts.subject_id = schedule_items.subject_id and ts.teacher_id = auth.uid()
    )
  );
create policy schedule_items_write_owner_only on public.schedule_items
  for all using (public.is_owner()) with check (public.is_owner());
