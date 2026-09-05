-- Phase 1: School core (profiles, departments, department_assignments,
-- academic_years, school_settings, audit_logs) + RLS.
--
-- Security model: "owner" is a database-enforced supreme-authority role,
-- not a UI-hidden-button role. is_owner() is SECURITY DEFINER so it can be
-- safely referenced from the profiles table's own RLS policies without
-- infinite recursion. A BEFORE UPDATE trigger on profiles blocks a
-- non-owner from ever changing role/is_active/user_id on any profile,
-- including their own — this is the concrete defense against the
-- "teacher escalates to owner" acceptance test.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'teacher')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.department_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, department_id)
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  check (end_date > start_date)
);

create table public.school_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (user_id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_department_assignments_user on public.department_assignments (user_id);
create index idx_department_assignments_department on public.department_assignments (department_id);
create index idx_audit_logs_actor on public.audit_logs (actor_id);
create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Owner-check helper (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

-- ---------------------------------------------------------------------
-- Privilege-escalation guard trigger on profiles
-- ---------------------------------------------------------------------

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    if new.role is distinct from old.role then
      raise exception 'Only an owner can change a profile role.';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only an owner can change a profile active status.';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id is immutable.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.department_assignments enable row level security;
alter table public.academic_years enable row level security;
alter table public.school_settings enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: owner sees/edits everyone; a user sees/edits only their own row
-- (role/is_active/user_id changes on their own row are blocked by the
-- trigger above regardless of this policy).
create policy profiles_select on public.profiles
  for select using (public.is_owner() or user_id = auth.uid());

create policy profiles_insert_owner_only on public.profiles
  for insert with check (public.is_owner());

create policy profiles_update on public.profiles
  for update using (public.is_owner() or user_id = auth.uid());

create policy profiles_delete_owner_only on public.profiles
  for delete using (public.is_owner());

-- departments: any authenticated user can read the registry; only owner
-- can manage it.
create policy departments_select_authenticated on public.departments
  for select using (auth.role() = 'authenticated');

create policy departments_write_owner_only on public.departments
  for all using (public.is_owner()) with check (public.is_owner());

-- department_assignments: owner sees/manages all; a user sees only their
-- own assignments.
create policy department_assignments_select on public.department_assignments
  for select using (public.is_owner() or user_id = auth.uid());

create policy department_assignments_write_owner_only on public.department_assignments
  for all using (public.is_owner()) with check (public.is_owner());

-- academic_years: any authenticated user can read; only owner writes.
create policy academic_years_select_authenticated on public.academic_years
  for select using (auth.role() = 'authenticated');

create policy academic_years_write_owner_only on public.academic_years
  for all using (public.is_owner()) with check (public.is_owner());

-- school_settings: any authenticated user can read; only owner writes.
create policy school_settings_select_authenticated on public.school_settings
  for select using (auth.role() = 'authenticated');

create policy school_settings_write_owner_only on public.school_settings
  for all using (public.is_owner()) with check (public.is_owner());

-- audit_logs: append-only. Owner reads everything. Any authenticated user
-- may insert a row attributed to themselves (self-attested actor_id) so
-- teacher actions can be logged without a service-role round trip; only
-- the owner may insert on someone else's behalf. No update/delete policy
-- exists for anyone, so the log is immutable by default-deny.
create policy audit_logs_select_owner_only on public.audit_logs
  for select using (public.is_owner());

create policy audit_logs_insert on public.audit_logs
  for insert with check (public.is_owner() or actor_id = auth.uid());
