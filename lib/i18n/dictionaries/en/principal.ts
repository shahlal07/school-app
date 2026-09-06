/**
 * Principal-role dictionary. Namespaced under `principal`. New keys only -
 * anything that already exists in core.ts (common/nav/status/terms/
 * intelligence/ownerDashboard/emptyStates) should be reused instead of
 * duplicated here.
 */
const principal = {
  academicHealth: {
    roleLabel: "Principal"
  },
  interventions: {
    title: "Academic interventions",
    subtitle: "School-wide oversight of interventions, owners, and outcomes.",
    registerTitle: "Intervention register",
    noInterventions: "No interventions recorded yet.",
    studentRecord: "Student record",
    due: "due",
    noDueDate: "no due date",
    outcomeLabel: "Outcome:"
  },
  dashboard: {
    welcomeBack: "Welcome back",
    moreUrgentAlert: "more urgent alert",
    moreUrgentAlerts: "more urgent alerts",
    subjectNeedsChapters: "subject still needs chapters added.",
    subjectsNeedChapters: "subjects still need chapters added.",
    viewSyllabus: "View syllabus"
  },
  scheduleStatus: {
    upcoming: "Upcoming",
    skipped: "Skipped",
    rescheduled: "Rescheduled"
  },
  common: {
    unknownClass: "Unknown class",
    unknownSubject: "Unknown subject",
    unknownChapter: "Unknown chapter"
  },
  attendance: {
    eyebrow: "Attendance department",
    title: "Daily attendance oversight",
    subtitleSuffix:
      "school-wide attendance updates automatically as teachers submit first-period roll."
  },
  classes: {
    subtitle: "Assign the homeroom teacher responsible for each class section."
  },
  students: {
    subtitle: "Manage the student roster per class and section."
  },
  syllabus: {
    subtitle: "Subjects, chapters, and topics for every class. Editing happens on the owner side."
  },
  papers: {
    subtitle:
      "Exam papers teachers have submitted. Approving or rejecting a paper happens on the coordinator side."
  },
  schedule: {
    subtitle:
      "Every scheduled test, grouped by class and subject. Generating new schedules happens on the owner side.",
    emptyDescription: "Once tests are scheduled for a subject, they will show up here."
  },
  alerts: {
    subtitle:
      "Compliance issues detected automatically across papers, tests, and results. Resolving an alert happens on the owner side.",
    open: "Open",
    resolved: "Resolved",
    noIssuesTitle: "No compliance issues right now",
    noIssuesDescription: "Every paper, test, and result is on track.",
    nothingResolvedTitle: "Nothing resolved yet",
    nothingResolvedDescription: "Alerts resolved by the owner will be kept here as a history."
  },
  results: {
    subtitle: "Every completed test and how many students have been graded so far.",
    emptyTitle: "No completed tests yet",
    emptyDescription:
      "Once a test is scheduled, submitted, and marked conducted, it will show up here for results tracking.",
    graded: "graded"
  },
  reports: {
    subtitle:
      "Operational summaries computed from real data - syllabus coverage and teacher compliance.",
    syllabusCoverageByClass: "Syllabus coverage by class",
    subjectsLabel: "subjects",
    noTeachersYet: "No teachers yet.",
    subjectAssigned: "subject assigned",
    subjectsAssigned: "subjects assigned",
    noTestsYet: "No tests yet",
    papersLabel: "papers"
  },
  performance: {
    subtitle: "Aggregate pass-rate analytics across classes, subjects, and topics.",
    emptyTitle: "No results yet",
    emptyDescription:
      "Performance analytics will appear here once teachers start entering test results."
  },
  messages: {
    noOwnerTitle: "No owner account found",
    noOwnerDescription: "There is no owner account to message yet.",
    noMessagesTitle: "No messages yet",
    noMessagesDescription: "Your conversation with the school owner will appear here.",
    replyLabel: "Reply",
    placeholder: "Write a message to the school owner...",
    send: "Send",
    emptyBody: "Message cannot be empty.",
    ownerNotFound: "Could not find the school owner to message."
  }
} as const;

export default principal;
