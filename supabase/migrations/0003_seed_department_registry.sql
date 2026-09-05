-- Examination is the only fully-built department. Attendance/fees are
-- inserted inactive to prove the registry pattern works for future
-- departments without any schema change.
insert into public.departments (slug, name, description, is_active) values
  ('examination', 'Examination', 'Syllabus, scheduling, papers, results, and academic performance tracking.', true),
  ('attendance', 'Attendance', 'Daily attendance tracking (not yet built).', false),
  ('fees', 'Fees', 'Fee structures, invoices, and payments (not yet built).', false);
