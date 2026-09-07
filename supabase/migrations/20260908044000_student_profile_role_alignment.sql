create or replace function public.clerk_upsert_student_profile(p_student_id uuid,p_father_name text,p_guardian_name text,p_guardian_relation text,p_date_of_birth date,p_gender text,p_nationality text,p_address text,p_city text,p_contact_number text,p_guardian_contact_number text,p_admission_date date,p_previous_school text,p_blood_group text,p_notes text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not can_manage_student_records() then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.students where id=p_student_id) then raise exception 'student_not_found'; end if;
  insert into public.student_profiles(student_id,father_name,guardian_name,guardian_relation,date_of_birth,gender,nationality,address,city,contact_number,guardian_contact_number,admission_date,previous_school,blood_group,notes,updated_at)
  values(p_student_id,nullif(btrim(p_father_name),''),nullif(btrim(p_guardian_name),''),nullif(btrim(p_guardian_relation),''),p_date_of_birth,nullif(btrim(p_gender),''),nullif(btrim(p_nationality),''),nullif(btrim(p_address),''),nullif(btrim(p_city),''),nullif(btrim(p_contact_number),''),nullif(btrim(p_guardian_contact_number),''),p_admission_date,nullif(btrim(p_previous_school),''),nullif(btrim(p_blood_group),''),nullif(btrim(p_notes),''),now())
  on conflict(student_id) do update set father_name=excluded.father_name,guardian_name=excluded.guardian_name,guardian_relation=excluded.guardian_relation,date_of_birth=excluded.date_of_birth,gender=excluded.gender,nationality=excluded.nationality,address=excluded.address,city=excluded.city,contact_number=excluded.contact_number,guardian_contact_number=excluded.guardian_contact_number,admission_date=excluded.admission_date,previous_school=excluded.previous_school,blood_group=excluded.blood_group,notes=excluded.notes,updated_at=now();
end; $$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (is_owner() or user_id=(select auth.uid()) or (can_manage_student_records() and role <> 'owner'));
