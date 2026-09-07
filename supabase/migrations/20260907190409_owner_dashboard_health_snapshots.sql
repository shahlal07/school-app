create table if not exists public.academic_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  health_score int not null,
  exam_readiness_score int not null,
  teacher_compliance_score int not null,
  syllabus_progress_score int not null,
  result_completion_score int not null,
  student_performance_score int not null,
  students_at_risk_count int not null,
  attendance_pct numeric,
  overall_average numeric,
  pass_rate numeric,
  created_at timestamptz not null default now()
);

alter table public.academic_health_snapshots enable row level security;

create policy academic_health_snapshots_select on public.academic_health_snapshots
for select to authenticated
using (can_view_school_wide());

create policy academic_health_snapshots_upsert on public.academic_health_snapshots
for insert to authenticated
with check (can_view_school_wide());

create policy academic_health_snapshots_update on public.academic_health_snapshots
for update to authenticated
using (can_view_school_wide())
with check (can_view_school_wide());
