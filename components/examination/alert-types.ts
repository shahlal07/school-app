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
  | "paper_printed"
  | "attendance_submission_missing"
  | "attendance_compliance_warning"
  | "student_attendance_warning"
  | "class_attendance_warning"
  | "exam_attendance_result_exception";

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

/**
 * These map each alert type/severity to a TranslationKey (a dot-path into
 * the `alerts` i18n dictionary), not literal text - this file is a plain
 * data module (no component instance), so it can't call useTranslation()
 * itself. Consumers (alert-card.tsx) resolve the key with t() at render
 * time.
 */
export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  paper_missing: "alerts.types.paperMissing",
  paper_deadline_approaching: "alerts.types.paperDeadlineApproaching",
  paper_rejected: "alerts.types.paperRejected",
  test_overdue: "alerts.types.testOverdue",
  test_not_conducted: "alerts.types.testNotConducted",
  results_missing: "alerts.types.resultsMissing",
  results_overdue: "alerts.types.resultsOverdue",
  syllabus_behind: "alerts.types.syllabusBehind",
  teacher_compliance_warning: "alerts.types.teacherComplianceWarning",
  student_performance_warning: "alerts.types.studentPerformanceWarning",
  class_performance_warning: "alerts.types.classPerformanceWarning",
  subject_performance_warning: "alerts.types.subjectPerformanceWarning",
  // 'paper_printed' is genuinely overloaded: the compliance scanner uses it
  // for "approved paper still NOT printed" (severity critical/urgent), while
  // the print-workflow's own mark_exam_paper_printed() RPC uses the SAME
  // type for "paper WAS printed" (severity info) - a fixed type-only label
  // would flatly contradict alert.message (rendered right below it) in one
  // of the two cases. Kept neutral so it never contradicts either meaning;
  // the actual message text always disambiguates which situation this is.
  paper_printed: "alerts.types.paperPrinted",
  // Added by the attendance <-> examination integration migration
  // (20260906193715_attendance_alerts_and_exam_reconciliation.sql), which
  // extended alerts_type_check with 5 more values - these were missing
  // from this map entirely, so any real row of one of these types made
  // ALERT_TYPE_LABEL[alert.type] resolve to undefined and crashed t()
  // (translate() does key.split(".") on it). Keep this map in sync with
  // that CHECK constraint's full value list.
  attendance_submission_missing: "alerts.types.attendanceSubmissionMissing",
  attendance_compliance_warning: "alerts.types.attendanceComplianceWarning",
  student_attendance_warning: "alerts.types.studentAttendanceWarning",
  class_attendance_warning: "alerts.types.classAttendanceWarning",
  exam_attendance_result_exception: "alerts.types.examAttendanceResultException"
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

/** TranslationKey per severity - see ALERT_TYPE_LABEL's comment above. */
export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: "alerts.severity.info",
  warning: "alerts.severity.warning",
  urgent: "alerts.severity.urgent",
  critical: "alerts.severity.critical"
};
