/**
 * Alert-type/severity label dictionary shared by the owner/principal/
 * coordinator/teacher alert feeds (components/examination/alert-card.tsx +
 * alert-types.ts). Namespaced under `alerts`. New keys only.
 */
const alerts = {
  types: {
    paperMissing: "Paper missing",
    paperDeadlineApproaching: "Paper deadline approaching",
    paperRejected: "Paper rejected",
    testOverdue: "Test overdue",
    testNotConducted: "Test not conducted",
    resultsMissing: "Results missing",
    resultsOverdue: "Results overdue",
    syllabusBehind: "Syllabus behind schedule",
    teacherComplianceWarning: "Teacher compliance warning",
    studentPerformanceWarning: "Student performance warning",
    classPerformanceWarning: "Class performance warning",
    subjectPerformanceWarning: "Subject performance warning",
    paperPrinted: "Paper printing update"
  },
  severity: {
    info: "Info",
    warning: "Warning",
    urgent: "Urgent",
    critical: "Critical"
  },
  resolve: "Resolve",
  teacherLabel: "Teacher:",
  resolvedPrefix: "Resolved",
  justNow: "just now",
  minutesAgoSuffix: "m ago",
  hoursAgoSuffix: "h ago",
  daysAgoSuffix: "d ago"
} as const;

export default alerts;
