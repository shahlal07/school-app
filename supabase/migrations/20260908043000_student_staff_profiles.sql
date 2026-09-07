-- Complete clerk-managed student biodata and staff directory fields.
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  father_name text,
  guardian_name text,
  guardian_relation text,
  date_of_birth date,
  gender text,
  nationality text,
  address text,
  city text,
  contact_number text,
  guardian_contact_number text,
  admission_date date,
  previous_school text,
  blood_group text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
revoke all on public.student_profiles from anon;
grant select, insert, update, delete on public.student_profiles to authenticated;
create policy student_profiles_select_clerk on public.student_profiles for select to authenticated using (is_owner() or can_manage_student_records());
create policy student_profiles_insert_clerk on public.student_profiles for insert to authenticated with check (is_owner() or can_manage_student_records());
create policy student_profiles_update_clerk on public.student_profiles for update to authenticated using (is_owner() or can_manage_student_records()) with check (is_owner() or can_manage_student_records());
create policy student_profiles_delete_clerk on public.student_profiles for delete to authenticated using (is_owner() or can_manage_student_records());

create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username)) where username is not null;

create or replace function public.clerk_update_staff_profile(p_profile_id uuid,p_full_name text,p_phone text,p_username text,p_designation text,p_joining_date date,p_is_active boolean) returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_role text;
begin
  if v_user is null or not is_clerk() then raise exception 'not_authorized'; end if;
  select role into v_role from public.profiles where id=p_profile_id;
  if v_role is null then raise exception 'profile_not_found'; end if;
  if v_role='owner' then raise exception 'cannot_edit_owner'; end if;
  if p_full_name is null or btrim(p_full_name)='' then raise exception 'name_required'; end if;
  if p_username is not null and btrim(p_username)<>'' and p_username !~ '^[A-Za-z0-9._-]{3,50}$' then raise exception 'invalid_username'; end if;
  update public.profiles set full_name=btrim(p_full_name),phone=nullif(btrim(p_phone),''),username=nullif(btrim(p_username),''),designation=nullif(btrim(p_designation),''),joining_date=p_joining_date,is_active=p_is_active,updated_at=now() where id=p_profile_id;
end; $$;
revoke execute on function public.clerk_update_staff_profile(uuid,text,text,text,text,date,boolean) from public,anon,authenticated;
grant execute on function public.clerk_update_staff_profile(uuid,text,text,text,text,date,boolean) to authenticated;

create or replace function public.clerk_upsert_student_profile(p_student_id uuid,p_father_name text,p_guardian_name text,p_guardian_relation text,p_date_of_birth date,p_gender text,p_nationality text,p_address text,p_city text,p_contact_number text,p_guardian_contact_number text,p_admission_date date,p_previous_school text,p_blood_group text,p_notes text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not is_clerk() then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.students where id=p_student_id) then raise exception 'student_not_found'; end if;
  insert into public.student_profiles(student_id,father_name,guardian_name,guardian_relation,date_of_birth,gender,nationality,address,city,contact_number,guardian_contact_number,admission_date,previous_school,blood_group,notes,updated_at)
  values(p_student_id,nullif(btrim(p_father_name),''),nullif(btrim(p_guardian_name),''),nullif(btrim(p_guardian_relation),''),p_date_of_birth,nullif(btrim(p_gender),''),nullif(btrim(p_nationality),''),nullif(btrim(p_address),''),nullif(btrim(p_city),''),nullif(btrim(p_contact_number),''),nullif(btrim(p_guardian_contact_number),''),p_admission_date,nullif(btrim(p_previous_school),''),nullif(btrim(p_blood_group),''),nullif(btrim(p_notes),''),now())
  on conflict(student_id) do update set father_name=excluded.father_name,guardian_name=excluded.guardian_name,guardian_relation=excluded.guardian_relation,date_of_birth=excluded.date_of_birth,gender=excluded.gender,nationality=excluded.nationality,address=excluded.address,city=excluded.city,contact_number=excluded.contact_number,guardian_contact_number=excluded.guardian_contact_number,admission_date=excluded.admission_date,previous_school=excluded.previous_school,blood_group=excluded.blood_group,notes=excluded.notes,updated_at=now();
end; $$;
revoke execute on function public.clerk_upsert_student_profile(uuid,text,text,text,date,text,text,text,text,text,text,date,text,text,text) from public,anon,authenticated;
grant execute on function public.clerk_upsert_student_profile(uuid,text,text,text,date,text,text,text,text,text,text,date,text,text,text) to authenticated;
