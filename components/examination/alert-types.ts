export type AlertType =
  | "paper_missing"
  | "paper_deadline_approaching"
  | "paper_rejected"
  | "test_overdue"
  | "test_not_conducted"
  | "results_missing"
  | "results_overdue"
  | "syllabus_behind"
  | "teacher_compliance_warning"
  | "student_performance_warning"
  | "class_performance_warning"
  | "subject_performance_warning"
  | "paper_printed";

export type AlertSeverity = "info" | "warning" | "urgent" | "critical";

export type AlertStatus = "open" | "resolved";

/**
 * Row shape of the `alerts` table, populated automatically by the hourly
 * `scan_examination_compliance()` Postgres function - this app only reads
 * and (owner-side) resolves rows here, it never inserts/generates them.
 */
export interface AlertRow {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  teacher_id: string | null;
  reference_table: string | null;
  reference_id: string | null;
  message: string;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

/** An AlertRow enriched with the teacher's display name, when applicable. */
export interface AlertWithTeacher extends AlertRow {
  teacherName: string | null;
}

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  paper_missing: "Paper missing",
  paper_deadline_approaching: "Paper deadline approaching",
  paper_rejected: "Paper rejected",
  test_overdue: "Test overdue",
  test_not_conducted: "Test not conducted",
  results_missing: "Results missing",
  results_overdue: "Results overdue",
  syllabus_behind: "Syllabus behind schedule",
  teacher_compliance_warning: "Teacher compliance warning",
  student_performance_warning: "Student performance warning",
  class_performance_warning: "Class performance warning",
  subject_performance_warning: "Subject performance warning",
  // 'paper_printed' is genuinely overloaded: the compliance scanner uses it
  // for "approved paper still NOT printed" (severity critical/urgent), while
  // the print-workflow's own mark_exam_paper_printed() RPC uses the SAME
  // type for "paper WAS printed" (severity info) - a fixed type-only label
  // would flatly contradict alert.message (rendered right below it) in one
  // of the two cases. Kept neutral so it never contradicts either meaning;
  // the actual message text always disambiguates which situation this is.
  paper_printed: "Paper printing update"
};

/**
 * info/warning map directly onto the matching Badge variants; urgent and
 * critical both read as "danger" (the Badge component has no separate
 * urgent-vs-critical tier) - severity text is still shown verbatim in the
 * label below so the distinction isn't lost, just not color-coded further.
 */
export const ALERT_SEVERITY_BADGE_VARIANT: Record<
  AlertSeverity,
  "info" | "warning" | "danger"
> = {
  info: "info",
  warning: "warning",
  urgent: "danger",
  critical: "danger"
};

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: "Info",
  warning: "Warning",
  urgent: "Urgent",
  critical: "Critical"
};
