/**
 * Clerk-role dictionary. Namespaced under `clerk`. New keys only - anything
 * that already exists in core.ts (common/nav/status/terms/ownerDashboard/
 * emptyStates/etc.) should be reused instead of duplicated here.
 */
const clerk = {
  home: {
    title: "Clerk desk",
    subtitle: "Admissions and student-record management.",
    rosterByClass: "Roster by class",
    noClassesFound: "No classes found yet.",
    studentsSuffix: "students",
    manageStudents: "Manage students",
    staffRecords: "Staff records",
    staffRecordsDescription: "Set designation and joining date for teaching staff.",
    openStaffList: "Open staff list"
  },
  students: {
    title: "Students",
    subtitle: "Manage the student roster per class and section."
  },
  staff: {
    title: "Staff",
    subtitle: "Teaching-staff records: designation and joining date.",
    noStaffTitle: "No teaching staff yet",
    noStaffDescription: "Teacher accounts are created by the owner from Owner > Teachers.",
    inactive: "Inactive",
    designationLabel: "Designation",
    joiningDateLabel: "Joining date",
    editRecord: "Edit record",
    editDialogTitlePrefix: "Edit staff record for",
    editDialogDescription: "Sets designation and joining date via the set_staff_record_fields function.",
    designationInputPlaceholder: "e.g. Senior Teacher, Head of Science",
    toastUpdated: "Staff record updated"
  },
  papers: {
    title: "Exam printing",
    subtitle:
      "Submitted papers from teachers. Open them, place them for printing, then mark the physical print as completed.",
    noPapersTitle: "No exam papers yet",
    noPapersDescription: "Submitted teacher papers will appear here automatically.",
    paperFileMissing: "Paper file is missing.",
    waitingForApproval: "Waiting for coordinator approval",
    placedInQueue: "Placed in print queue",
    markedPrinted: "Marked printed. Teacher and coordinator notified.",
    reprintQueued: "Reprint queued with audit reason",
    reprintReasonPrompt: "Why is this paper being reprinted?",
    reprintCopiesPrompt: "How many copies?",
    invalidCopyCount: "Enter a valid copy count.",
    copiesLabel: "Copies",
    colorLabel: "Color",
    colorBw: "B&W",
    colorColor: "Color",
    sidesLabel: "Sides",
    sidesDouble: "Double-sided",
    sidesSingle: "Single-sided",
    pagesLabel: "Pages",
    pagesPlaceholder: "Optional",
    priorityLabel: "Priority",
    priorityNormal: "Normal",
    priorityHigh: "High",
    priorityUrgent: "Urgent",
    priorityLow: "Low",
    placeForPrinting: "Place for printing",
    markPrinted: "Mark printed",
    queueReprint: "Queue reprint",
    statusQueued: "Queued",
    paperPrefix: "Paper",
    examFallback: "Exam",
    unknownClass: "Unknown class",
    unknownSubject: "Unknown subject",
    unknownTeacher: "Unknown teacher",
    copiesUnit: "copies",
    pagesUnit: "pages",
    prioritySuffix: "priority"
  }
} as const;

export default clerk;
