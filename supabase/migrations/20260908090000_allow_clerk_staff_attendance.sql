drop policy if exists staff_attendance_insert on public.staff_attendance;
drop policy if exists staff_attendance_update on public.staff_attendance;

create policy staff_attendance_insert on public.staff_attendance for insert to authenticated
with check ((is_academic_coordinator() or is_clerk()) and marked_by=(select auth.uid()));

create policy staff_attendance_update on public.staff_attendance for update to authenticated
using (is_academic_coordinator() or is_clerk())
with check (is_academic_coordinator() or is_clerk());
