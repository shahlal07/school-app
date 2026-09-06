/**
 * Leadership-facing attendance components dictionary (coordinator/principal/
 * owner shared views - components/attendance/staff-attendance-form.tsx,
 * staff-attendance-summary.tsx, daily-attendance-report.tsx,
 * academic-operations-bridge.tsx). Namespaced under `attendanceLeadership`.
 * New keys only - reuse core.ts (common/nav/status/terms/...) where it
 * already fits.
 */
const attendanceLeadership = {
  staffForm: {
    eyebrow: "Staff attendance",
    subtitle: "Coordinator records the complete staff roll.",
    present: "Present",
    absent: "Absent",
    late: "Late",
    saving: "Saving…",
    saved: "Staff attendance saved",
    saveButton: "Save staff attendance",
    saveError: "Staff attendance could not be saved."
  },
  staffSummary: {
    eyebrow: "Staff attendance",
    rollTitlePrefix: "Staff roll",
    present: "Present",
    absent: "Absent",
    missing: "Missing",
    notMarked: "Not marked",
    noActiveStaff: "No active staff records.",
    statusLabel: {
      present: "Present",
      absent: "Absent",
      late: "Late",
      leave: "On leave",
      excused: "Excused"
    }
  },
  dailyReport: {
    statSchoolAttendance: "School attendance",
    statStudents: "Students",
    statAbsent: "Absent",
    statLate: "Late",
    notSubmittedEyebrow: "Attendance not submitted",
    notSubmittedDescription:
      "These class teachers have not completed first-period attendance for",
    assignedTeacher: "Assigned teacher:",
    classAttendanceTitlePrefix: "Class attendance",
    liveReportDescription:
      "Live school-wide report. Submitted attendance is available immediately to authorized leadership.",
    colClass: "Class",
    colStudents: "Students",
    colPresent: "Present",
    colAbsent: "Absent",
    colLate: "Late",
    colRate: "Rate",
    colStatus: "Status",
    statusSubmitted: "Submitted",
    statusActionNeeded: "Action needed",
    noAttendanceSubmitted: "No attendance has been submitted for this date."
  },
  bridge: {
    eyebrow: "Academic operations",
    title: "Attendance ↔ Examination",
    description:
      "Daily attendance explains academic risk; exam attendance explains whether a result should exist.",
    openAttendanceCenter: "Open attendance center",
    latestAttendance: "Latest attendance",
    vsPreviousDay: "vs previous day",
    studentsNeedingAttention: "Students needing attention",
    attendanceAcademicSignals: "attendance / academic signals",
    examResultExceptions: "Exam result exceptions",
    presentInExamResultMissing: "present in exam, result missing",
    teachersNeedingAttention: "Teachers needing attention",
    attendanceSubmissionCompliance: "attendance submission compliance",
    trendTitle: "14-day attendance trend",
    trendSubtitle: "School-wide submitted first-period rolls",
    daysSuffix: "days",
    noSubmittedDays: "No submitted attendance days yet.",
    attendanceLabel: "Attendance",
    assessmentLabel: "Assessment",
    noStudentSignal: "No cross-system student risk signal right now.",
    teacherComplianceTitle: "Teacher attendance compliance",
    classDaysSubmitted: "class-days submitted",
    allTeachersCompliant: "All tracked class teachers are at 90%+ submission compliance.",
    examExceptionsTitle: "Exam exceptions",
    resultMissing: "Result missing",
    noResultExceptions: "No result exceptions detected.",
    signalAttendanceAndAcademic: "Attendance + academic concern",
    signalAttendancePrimary: "Attendance concern",
    signalAcademicDespiteAttendance: "Academic concern despite attendance",
    signalNormal: "Normal"
  }
} as const;

export default attendanceLeadership;
