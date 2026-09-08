drop policy if exists staff_attendance_select on public.staff_attendance;
create policy staff_attendance_select
on public.staff_attendance
for select to authenticated
using (
  is_academic_coordinator()
  or is_clerk()
  or can_view_school_wide()
  or marked_by = (select auth.uid())
);

drop policy if exists staff_attendance_update on public.staff_attendance;
create policy staff_attendance_update
on public.staff_attendance
for update to authenticated
using (is_academic_coordinator() or is_clerk())
with check (is_academic_coordinator() or is_clerk());
