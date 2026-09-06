-- Clerk/Principal need to READ teacher profile rows (name, username, designation,
-- joining_date) to build/manage the staff list - can_manage_student_records()
-- already grants them WRITE to the two staff-record columns via the
-- set_staff_record_fields() RPC, but profiles SELECT was still owner-or-self
-- only, so they had no way to see whose records they're managing.
--
-- Scoped narrowly to role = 'teacher' rows only (not other owner/principal/
-- coordinator/clerk profile rows) so this does not leak other staff members'
-- profile data beyond what the student-record-administration job requires.
-- Additive: the existing owner/self clause is preserved verbatim.
alter policy profiles_select on public.profiles
  using (is_owner() or (user_id = (select auth.uid())) or (can_manage_student_records() and role = 'teacher'));
