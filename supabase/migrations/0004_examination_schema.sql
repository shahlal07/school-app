-- Phase 2: Examination database (classes, sections, students, subjects,
-- teacher_subjects, chapters, topics) + RLS.
--
-- Security model: owner bypasses everything via is_owner(). Teachers are
-- scoped through teacher_subjects — a teacher can only see subjects (and
-- their chapters/topics/students) they are actually assigned to, not the
-- whole school's catalog. classes/sections are structural reference data
-- (just names) and are readable by any authenticated user.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null,
  group_name text,
  academic_year_id uuid not null references public.academic_years (id) on delete restrict,
  unique (name, academic_year_id)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  unique (class_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  code text,
  group_name text,
  is_active boolean not null default true,
  unique (class_id, name)
);

create table public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (user_id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id, class_id)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  roll_no text not null,
  name text not null,
  is_active boolean not null default true,
  unique (class_id, section_id, roll_no)
);

create index idx_sections_class on public.sections (class_id);
create index idx_subjects_class on public.subjects (class_id);
create index idx_teacher_subjects_teacher on public.teacher_subjects (teacher_id);
create index idx_teacher_subjects_subject on public.teacher_subjects (subject_id);
create index idx_chapters_subject on public.chapters (subject_id);
create index idx_topics_chapter on public.topics (chapter_id);
create index idx_students_class_section on public.students (class_id, section_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;
alter table public.students enable row level security;

-- classes/sections: structural reference data, readable by any
-- authenticated user; only owner manages them.
create policy classes_select_authenticated on public.classes
  for select using (auth.role() = 'authenticated');
create policy classes_write_owner_only on public.classes
  for all using (public.is_owner()) with check (public.is_owner());

create policy sections_select_authenticated on public.sections
  for select using (auth.role() = 'authenticated');
create policy sections_write_owner_only on public.sections
  for all using (public.is_owner()) with check (public.is_owner());

-- subjects: owner sees everything; a teacher sees only subjects they are
-- assigned to via teacher_subjects. Only owner manages the catalog -
-- teachers view syllabus, they don't edit it.
create policy subjects_select on public.subjects
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.teacher_subjects ts
      where ts.subject_id = subjects.id and ts.teacher_id = auth.uid()
    )
  );
create policy subjects_write_owner_only on public.subjects
  for all using (public.is_owner()) with check (public.is_owner());

-- teacher_subjects: owner sees/manages all; a teacher sees only their own
-- assignment rows (this is the concrete "Teacher A cannot see Teacher B's
-- assignment" boundary).
create policy teacher_subjects_select on public.teacher_subjects
  for select using (public.is_owner() or teacher_id = auth.uid());
create policy teacher_subjects_write_owner_only on public.teacher_subjects
  for all using (public.is_owner()) with check (public.is_owner());

-- chapters/topics: scoped through the parent subject's assignment, same
-- rule as subjects. Only owner writes.
create policy chapters_select on public.chapters
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.teacher_subjects ts
      where ts.subject_id = chapters.subject_id and ts.teacher_id = auth.uid()
    )
  );
create policy chapters_write_owner_only on public.chapters
  for all using (public.is_owner()) with check (public.is_owner());

create policy topics_select on public.topics
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.teacher_subjects ts
      join public.chapters c on c.subject_id = ts.subject_id
      where c.id = topics.chapter_id and ts.teacher_id = auth.uid()
    )
  );
create policy topics_write_owner_only on public.topics
  for all using (public.is_owner()) with check (public.is_owner());

-- students: owner sees/manages all; a teacher sees students only in
-- classes they are assigned to teach (needed later for result entry).
-- Only owner writes for now (CSV import / roster management is owner-run
-- in this phase; teacher-side result entry comes in a later phase).
create policy students_select on public.students
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.teacher_subjects ts
      where ts.class_id = students.class_id and ts.teacher_id = auth.uid()
    )
  );
create policy students_write_owner_only on public.students
  for all using (public.is_owner()) with check (public.is_owner());
