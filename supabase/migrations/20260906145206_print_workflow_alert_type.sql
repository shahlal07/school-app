-- alerts_type_check didn't include 'paper_printed', which the print
-- workflow needs to insert as its notification type. Additive: every
-- existing allowed type is preserved verbatim. Still in active use by the
-- more complete print-job system built concurrently (exam_paper_print_jobs).
alter table public.alerts drop constraint alerts_type_check;
alter table public.alerts add constraint alerts_type_check
  check (type = any (array[
    'paper_missing','paper_deadline_approaching','paper_rejected','test_overdue',
    'test_not_conducted','results_missing','results_overdue','syllabus_behind',
    'teacher_compliance_warning','student_performance_warning','class_performance_warning',
    'subject_performance_warning','paper_printed'
  ]));
