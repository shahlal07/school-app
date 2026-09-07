create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  document_type text not null,
  status text not null default 'pending' check (status in ('pending','received','verified')),
  uploaded_by uuid references public.profiles(user_id),
  uploaded_at timestamptz not null default now(),
  notes text
);

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  class_id uuid not null references public.classes(id),
  status text not null default 'inquiry' check (status in ('inquiry','pending','enrolled','rejected')),
  applied_at timestamptz not null default now(),
  processed_by uuid references public.profiles(user_id),
  notes text
);

create table if not exists public.fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid','overdue')),
  paid_at timestamptz,
  recorded_by uuid references public.profiles(user_id)
);

alter table public.student_documents enable row level security;
alter table public.admissions enable row level security;
alter table public.fee_records enable row level security;

create policy student_documents_select on public.student_documents for select to authenticated
  using (can_manage_student_records());
create policy student_documents_insert on public.student_documents for insert to authenticated
  with check (can_manage_student_records());
create policy student_documents_update on public.student_documents for update to authenticated
  using (can_manage_student_records()) with check (can_manage_student_records());
create policy student_documents_delete on public.student_documents for delete to authenticated
  using (can_manage_student_records());

create policy admissions_select on public.admissions for select to authenticated
  using (can_manage_student_records());
create policy admissions_insert on public.admissions for insert to authenticated
  with check (can_manage_student_records());
create policy admissions_update on public.admissions for update to authenticated
  using (can_manage_student_records()) with check (can_manage_student_records());
create policy admissions_delete on public.admissions for delete to authenticated
  using (can_manage_student_records());

create policy fee_records_select on public.fee_records for select to authenticated
  using (can_manage_student_records());
create policy fee_records_insert on public.fee_records for insert to authenticated
  with check (can_manage_student_records());
create policy fee_records_update on public.fee_records for update to authenticated
  using (can_manage_student_records()) with check (can_manage_student_records());
create policy fee_records_delete on public.fee_records for delete to authenticated
  using (can_manage_student_records());

create index if not exists student_documents_student_id_idx on public.student_documents(student_id);
create index if not exists student_documents_status_idx on public.student_documents(status);
create index if not exists admissions_class_id_idx on public.admissions(class_id);
create index if not exists admissions_status_applied_at_idx on public.admissions(status, applied_at);
create index if not exists fee_records_student_id_idx on public.fee_records(student_id);
create index if not exists fee_records_status_due_date_idx on public.fee_records(status, due_date);
