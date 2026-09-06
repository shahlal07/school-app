create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  status text not null default 'draft' check (status in ('draft','submitted','reopened')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_date, class_id, section_id)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  roll_no_snapshot text not null,
  status text not null check (status in ('present','absent','late','leave','excused')),
  note text,
  marked_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  staff_id uuid not null references public.profiles(user_id) on delete restrict,
  status text not null check (status in ('present','absent','late','leave','excused')),
  note text,
  marked_by uuid not null references auth.users(id) on delete restrict,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_date, staff_id)
);

create index if not exists attendance_sessions_date_idx on public.attendance_sessions(attendance_date);
create index if not exists attendance_sessions_class_idx on public.attendance_sessions(class_id, section_id, attendance_date);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id, session_id);
create index if not exists staff_attendance_date_idx on public.staff_attendance(attendance_date);
create index if not exists staff_attendance_staff_idx on public.staff_attendance(staff_id, attendance_date);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.staff_attendance enable row level security;

create policy attendance_sessions_select on public.attendance_sessions for select to authenticated
using (can_view_school_wide() or submitted_by = (select auth.uid()) or exists (select 1 from public.class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=attendance_sessions.class_id and ct.section_id=attendance_sessions.section_id));

create policy attendance_sessions_insert on public.attendance_sessions for insert to authenticated
with check (submitted_by=(select auth.uid()) and (is_owner() or is_principal() or is_academic_coordinator() or exists (select 1 from public.class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=attendance_sessions.class_id and ct.section_id=attendance_sessions.section_id)));

create policy attendance_sessions_update on public.attendance_sessions for update to authenticated
using (can_view_school_wide() or submitted_by=(select auth.uid()))
with check (can_view_school_wide() or submitted_by=(select auth.uid()));

create policy attendance_records_select on public.attendance_records for select to authenticated
using (exists (select 1 from public.attendance_sessions s where s.id=attendance_records.session_id));

create policy attendance_records_insert on public.attendance_records for insert to authenticated
with check (exists (select 1 from public.attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or exists (select 1 from public.class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))));

create policy attendance_records_update on public.attendance_records for update to authenticated
using (exists (select 1 from public.attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or exists (select 1 from public.class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))))
with check (exists (select 1 from public.attendance_sessions s where s.id=attendance_records.session_id and (can_view_school_wide() or s.submitted_by=(select auth.uid()) or exists (select 1 from public.class_teachers ct where ct.teacher_id=(select auth.uid()) and ct.class_id=s.class_id and ct.section_id=s.section_id))));

create policy staff_attendance_select on public.staff_attendance for select to authenticated using (can_view_school_wide() or marked_by=(select auth.uid()));
create policy staff_attendance_insert on public.staff_attendance for insert to authenticated with check (is_academic_coordinator() and marked_by=(select auth.uid()));
create policy staff_attendance_update on public.staff_attendance for update to authenticated using (is_academic_coordinator()) with check (is_academic_coordinator());

create or replace function public.submit_attendance(p_class_id uuid,p_section_id uuid,p_attendance_date date,p_records jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user uuid := (select auth.uid()); v_session uuid; v_count int; v_expected int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not (exists (select 1 from public.class_teachers ct where ct.teacher_id=v_user and ct.class_id=p_class_id and ct.section_id=p_section_id) or is_owner() or is_principal() or is_academic_coordinator()) then raise exception 'not_authorized'; end if;
  select count(*) into v_expected from public.students s where s.class_id=p_class_id and s.section_id=p_section_id and s.is_active=true;
  select count(*) into v_count from jsonb_array_elements(p_records);
  if v_count <> v_expected then raise exception 'roster_mismatch'; end if;
  insert into public.attendance_sessions(attendance_date,class_id,section_id,submitted_by,status,submitted_at,updated_at) values(p_attendance_date,p_class_id,p_section_id,v_user,'submitted',now(),now()) on conflict(attendance_date,class_id,section_id) do update set submitted_by=excluded.submitted_by,status='submitted',submitted_at=now(),updated_at=now() returning id into v_session;
  delete from public.attendance_records where session_id=v_session;
  insert into public.attendance_records(session_id,student_id,roll_no_snapshot,status,note)
  select v_session,s.id,s.roll_no,x.status,nullif(x.note,'') from jsonb_array_elements(p_records) r join public.students s on s.id=(r->>'student_id')::uuid cross join lateral jsonb_to_record(r) as x(student_id text,status text,note text) where s.class_id=p_class_id and s.section_id=p_section_id and s.is_active=true;
  if (select count(*) from public.attendance_records ar where ar.session_id=v_session) <> v_expected then raise exception 'invalid_roster_submission'; end if;
  return v_session;
end; $$;
grant execute on function public.submit_attendance(uuid,uuid,date,jsonb) to authenticated;

create or replace function public.reopen_attendance(p_session_id uuid)
returns void language plpgsql security invoker set search_path=public as $$ begin if not (is_academic_coordinator() or is_principal() or is_owner()) then raise exception 'not_authorized'; end if; update public.attendance_sessions set status='reopened',updated_at=now() where id=p_session_id; end; $$;
grant execute on function public.reopen_attendance(uuid) to authenticated;

create or replace view public.attendance_daily_report with (security_invoker=true) as
select s.id session_id,s.attendance_date,s.class_id,c.name class_name,s.section_id,sec.name section_name,s.status session_status,s.submitted_by,s.submitted_at,count(ar.id)::int total_students,count(ar.id) filter(where ar.status='present')::int present_count,count(ar.id) filter(where ar.status='absent')::int absent_count,count(ar.id) filter(where ar.status='late')::int late_count,count(ar.id) filter(where ar.status in('leave','excused'))::int excused_count,round(case when count(ar.id)=0 then 0 else count(ar.id) filter(where ar.status='present')::numeric*100/count(ar.id) end,1) attendance_percentage
from public.attendance_sessions s join public.classes c on c.id=s.class_id join public.sections sec on sec.id=s.section_id left join public.attendance_records ar on ar.session_id=s.id
group by s.id,c.name,sec.name;
grant select on public.attendance_daily_report to authenticated;
