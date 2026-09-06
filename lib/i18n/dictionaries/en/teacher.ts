/**
 * Teacher-role dictionary. Everything here is namespaced under the single
 * top-level `teacher` key (including attendance-submission UI, under
 * `teacher.attendance`) so merging this file into the root dictionary is a
 * plain object spread with no risk of clobbering another role's top-level
 * domain keys (e.g. owner.ts already owns a top-level `attendance` key for
 * its own read-only attendance overview). Anything that already exists in
 * core.ts (common/nav/status/terms/...) is reused instead of duplicated.
 */
const teacher = {
  teacher: {
    home: {
      eyebrow: "Teacher dashboard",
      greeting: "Hi",
      fallbackName: "there",
      subtitle: "Your teaching, exam and follow-up tasks in one place.",
      classTeacherBadgePrefix: "Class Teacher",
      statTodayClasses: "Today's classes",
      statPaperActions: "Paper actions",
      statMarksPending: "Marks pending",
      statNeedsAttention: "Needs attention",
      openExamWorkspace: "Open exam workspace",
      openMessages: "Open messages",
      examReadinessHeading: "Exam readiness · next 7 days",
      printedCountSuffix: "paper(s) are already marked printed.",
      seeAll: "See all",
      todaysScheduleHeading: "Today's schedule",
      viewWeek: "View week",
      emptyTodayTitle: "Nothing scheduled today",
      emptyTodayNoSubjects: "No subjects are assigned yet.",
      emptyTodayBreak: "Enjoy the break. Your next exam tasks are shown above.",
      classFallback: "Class",
      subjectFallback: "Subject"
    },
    testType: {
      topic: "Topic test",
      chapter: "Chapter test",
      revision: "Revision",
      monthly: "Monthly",
      midterm: "Midterm",
      terminal: "Terminal",
      final: "Final",
      custom: "Custom"
    },
    schedule: {
      statusUpcoming: "Upcoming",
      statusSkipped: "Skipped",
      statusRescheduled: "Rescheduled"
    },
    exams: {
      subtitle: "Your scheduled tests, grouped by date.",
      emptyTitle: "No exams assigned yet",
      emptyDescription:
        "You don't have any subjects assigned yet, so there's nothing to schedule. Once the school owner assigns you to a subject, your upcoming tests will show up here.",
      sectionToday: "Today",
      sectionThisWeek: "This week",
      sectionUpcoming: "Upcoming",
      sectionPast: "Past"
    },
    examDetail: {
      backToExams: "Back to exams",
      examNotFound: "Exam not found."
    },
    paperEditor: {
      returnedNotice:
        "This paper was returned for changes. Submitting again creates a new immutable version; the earlier version stays in the history.",
      contentLabel: "Paper content (optional when uploading a file)",
      contentPlaceholder: "Paste or write the exam paper text here...",
      fileLabel: "Paper file",
      fileHint: "(PDF, Word, or a photo of the paper - max 15 MB)",
      saveDraft: "Save draft",
      submitPaper: "Submit paper",
      lockedNotice:
        "This submission is locked. After review, changes are made by revising the rejected paper into a new version.",
      toastDraftSaved: "Draft saved",
      toastSubmitted: "Paper submitted for coordinator review.",
      contentEmpty: "Paper content cannot be empty.",
      papersLocked: "Submitted papers are locked. Wait for review or use the rejection notes to revise.",
      contentEmptyBeforeSubmit: "Paper content cannot be empty before submitting.",
      alreadySubmittedLocked: "This paper has already been submitted and is locked until review.",
      versionError: "Could not determine the next paper version.",
      chooseFile: "Choose a PDF, Word document, or a photo of the paper.",
      fileTooLarge: "Paper must be 15 MB or smaller.",
      fileTypeInvalid: "Upload a PDF, Word document, or a photo (JPEG/PNG/HEIC/WEBP).",
      notAssigned: "You are not assigned to this exam."
    },
    paperTimeline: {
      heading: "Paper history",
      versionLabel: "Version",
      versionActiveSuffix: "is the active submission.",
      openPaper: "Open paper",
      done: "Done",
      waiting: "Waiting",
      latestReviewNote: "Latest review note",
      versionsHeading: "Versions",
      printRecordsHeading: "Print records",
      queuedForPrinting: "Queued for printing",
      copiesLabel: "copies",
      colorLabel: "Color",
      bwLabel: "B&W",
      duplexLabel: "Duplex",
      singleSidedLabel: "Single-sided",
      queuedOn: "Queued",
      reprintLabel: "Reprint:"
    },
    resultsRoster: {
      totalMarksLabel: "Total marks",
      searchLabel: "Search students",
      searchPlaceholder: "Roll number or name...",
      rollPrefix: "Roll #",
      examAbsentBadge: "Exam absent · result not required",
      pass: "Pass",
      fail: "Fail",
      absentLabel: "Absent",
      saveAll: "Save all",
      submitForReview: "Submit results for review",
      noStudents: "No students found for this class.",
      invalidTotalMarks: "Enter a valid total marks value first.",
      toastSaved: "Results saved",
      toastSubmitted: "Results submitted for coordinator review",
      totalMarksPositive: "Total marks must be a positive number.",
      marksRangePrefix: "Marks must be between 0 and",
      noActiveStudents: "No active students are enrolled in this class.",
      enterAllResultsPrefix: "Enter results for all",
      enterAllResultsSuffix: "students before submitting.",
      everyPresentNeedsMarks: "Every present student needs marks before submission.",
      notOwner: "You do not own this result submission.",
      alreadySubmitted: "Results are already submitted."
    },
    alerts: {
      subtitle: "Compliance issues the school owner has been notified about for your classes.",
      openHeading: "Open",
      resolvedHeading: "Resolved",
      emptyTitle: "You're all caught up",
      emptyDescription:
        "No open compliance issues for you right now. This updates automatically as papers, tests, and results are tracked."
    },
    profile: {
      classTeacherOfPrefix: "Class Teacher of",
      assignedSubjects: "Assigned subjects",
      noSubjects: "No subjects assigned yet - contact the school owner.",
      unknownSubject: "Unknown subject",
      unknownClass: "Unknown class",
      footerNote: "Need a password reset or a subject change? Contact the school owner directly."
    },
    messages: {
      emptyTitle: "No messages yet",
      emptyDescription: "Your conversation with the school owner will appear here.",
      replyLabel: "Reply",
      replyPlaceholder: "Write a message to the school owner...",
      send: "Send",
      toastSent: "Message sent",
      messageEmpty: "Message cannot be empty.",
      ownerNotFound: "Could not find the school owner to message."
    },
    attendance: {
      eyebrow: "Attendance department",
      sectionFallback: "Section",
      noClassTitle: "No class assigned",
      noClassDescription:
        "Ask the coordinator to assign you as a class teacher. Attendance is tied to that assignment.",
      firstPeriodLabel: "first period",
      activeStudentsSuffix: "active students",
      rollNumberNote: "Roll number is the classroom key. Student identity stays linked in the database.",
      presentLabel: "Present",
      absentLabel: "Absent",
      lateLabel: "Late",
      excusedLabel: "Excused",
      studentsSuffix: "students",
      classForm: {
        eyebrow: "First period attendance",
        subtitle: "Mark only the exceptions. Everyone starts as Present.",
        errorSaving: "Attendance could not be saved. Please try again or contact the coordinator.",
        submittedMessage: "Attendance submitted.",
        submittedSubMessage: "Coordinator, principal and owner can see it now.",
        submitting: "Submitting attendance…",
        submitPrefix: "Submit attendance"
      },
      examForm: {
        eyebrow: "Exam attendance",
        subtitle: "Use the same roll-number roster. Present by default; mark only exceptions.",
        searchPlaceholder: "Search roll number or student name",
        searchAriaLabel: "Search exam attendance roster",
        noMatch: "No students match this search.",
        errorSaving: "Exam attendance could not be saved.",
        submittedMessage: "Exam attendance recorded.",
        submittedSubMessage: "Students marked Absent/Excused are handled separately by result reconciliation.",
        submitting: "Submitting exam attendance…",
        submitPrefix: "Submit exam attendance"
      }
    }
  }
} as const;

export default teacher;
