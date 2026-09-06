/**
 * Owner-role dictionary. Namespaced under `owner`. New keys only - anything
 * that already exists in core.ts (common/nav/status/terms/intelligence/
 * ownerDashboard/emptyStates) should be reused instead of duplicated here.
 */
const owner = {
  academicHealth: {
    roleLabel: "Owner"
  },
  dashboard: {
    academicHealthCardTitle: "School academic health",
    outOf100: "out of 100",
    moreUrgentAlertSingular: "more urgent alert",
    moreUrgentAlertPlural: "more urgent alerts",
    setPrefix: "Set",
    dayPrefix: "Day",
    ofWord: "of",
    allSubjectsConducted: "All subjects conducted",
    noSubjectsScheduledYet: "No subjects scheduled yet",
    inviteTeacherButton: "Invite teacher",
    subjectNeedsChaptersSingular: "subject still needs chapters added.",
    subjectNeedsChaptersPlural: "subjects still need chapters added."
  },
  interventions: {
    title: "Academic interventions",
    subtitle: "Owner visibility into interventions and whether actions produced outcomes.",
    registerTitle: "Intervention register",
    noInterventions: "No interventions recorded yet.",
    studentRecord: "Student record",
    due: "due",
    noDueDate: "no due date",
    outcomeLabel: "Outcome:"
  },
  attendance: {
    eyebrow: "Attendance department",
    title: "Attendance overview",
    subtitleSuffix: "executive awareness only. Routine attendance entry stays with teachers and the coordinator."
  },
  students: {
    subtitle: "Manage the student roster per class and section.",
    nameRequired: "Name is required.",
    rollNoRequired: "Roll number is required.",
    rollNoExistsPrefix: "Roll number",
    rollNoExistsSuffix: "already exists in this section.",
    rollNoAlreadyExists: "Roll number already exists"
  },
  departments: {
    subtitle:
      "School OS is built to grow beyond examinations - each row here is a department that can become a fully-built module later, the same way Examination already is.",
    notBuiltYet: "Not built yet",
    noDescription: "No description yet."
  },
  classes: {
    subtitle: "Assign the homeroom teacher responsible for each class section.",
    noSectionsYet: "No sections yet",
    noSectionsYetDescription: "Add classes and sections first, then come back to assign homeroom teachers.",
    unassigned: "Unassigned",
    change: "Change",
    assign: "Assign",
    assignedToast: "Class teacher assigned",
    removedToast: "Class teacher removed",
    dialogTitlePrefix: "Class teacher for",
    dialogDescription: "This teacher will be shown as the homeroom / class teacher for this section.",
    selectATeacher: "Select a teacher",
    current: "current",
    removeClassTeacher: "Remove class teacher"
  },
  messages: {
    emptyMessage: "Message cannot be empty.",
    noTeacherSelected: "No teacher selected.",
    noTeachersToMessage: "There are no teachers to message yet.",
    broadcastSent: "Broadcast sent to all teachers",
    noOneToMessage: "No one to message yet",
    noOneToMessageDescription: "Invite a teacher first, then their conversation will show up here.",
    broadcastToAll: "Broadcast to all",
    noMessagesYet: "No messages yet",
    backToConversations: "Back to conversations",
    startConversationWith: "Start the conversation with",
    replyLabel: "Reply",
    writeMessagePlaceholder: "Write a message...",
    send: "Send",
    selectConversation: "Select a conversation to view messages.",
    broadcastDialogTitle: "Broadcast to all teachers",
    broadcastDialogDescription: "This sends the same message to every active teacher as an individual message.",
    messageLabel: "Message",
    announcementPlaceholder: "Write an announcement for all teachers...",
    sendToAllTeachers: "Send to all teachers"
  },
  teachers: {
    passwordsDontMatch: "Passwords don't match.",
    createAccountTitle: "Create an account",
    createAccountDescription: "Set a username and password yourself, then give them to the person directly - no email needed.",
    fullName: "Full name",
    username: "Username",
    usernamePlaceholder: "e.g. ahmed.khan",
    role: "Role",
    password: "Password",
    confirmPassword: "Confirm password",
    createAccount: "Create account",
    resetPasswordForPrefix: "Reset password for",
    resetPasswordDescription: "They'll need this new password to sign in - there's no email recovery for username accounts.",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    resetPassword: "Reset password",
    deactivated: "Deactivated",
    reactivated: "Reactivated",
    noStaffYet: "No staff yet",
    noStaffYetDescription: "Create your first staff account to get started.",
    inactive: "Inactive",
    assignSubjects: "Assign subjects",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    accountCreatedSuffix: "'s account created",
    passwordResetToast: "Password reset",
    assignedToast: "Assigned",
    removedToast: "Removed",
    assignSubjectsToPrefix: "Assign subjects to",
    assignSubjectsDescription: "This teacher will only ever see data for the class + subject combinations assigned here - nothing else.",
    noSubjectsAssignedYet: "No subjects assigned yet.",
    selectAClass: "Select a class",
    selectASubject: "Select a subject",
    addAssignment: "Add assignment",
    done: "Done",
    fullNameRequired: "Full name is required.",
    invalidRole: "Invalid role.",
    passwordMinLengthPrefix: "Password must be at least",
    passwordMinLengthSuffix: "characters.",
    usernameTakenPrefix: "Username",
    usernameTakenSuffix: "is already taken.",
    unableToCreateAccount: "Unable to create account.",
    alreadyAssignedToSubject: "This teacher is already assigned to that subject."
  },
  settings: {
    subtitle: "School-wide examination settings.",
    passPercentage: "Pass percentage",
    passPercentageDescription:
      "The minimum percentage a student needs to pass any test. Applies school-wide - every result's pass/fail status is computed against this value automatically.",
    updated: "Pass percentage updated",
    invalidPassPercentage: "Pass percentage must be a number between 1 and 100."
  },
  alerts: {
    subtitle: "Compliance issues detected automatically across papers, tests, and results."
  },
  schedule: {
    subtitle: "What's already scheduled for each subject. Generating a schedule happens on the coordinator side.",
    nothingToSave: "Nothing to save - generate a preview first."
  },
  syllabus: {
    subtitle: "Subjects, chapters, and topics for every class. Editing happens on the coordinator side.",
    subjectNameEmpty: "Subject name cannot be empty.",
    chapterNameEmpty: "Chapter name cannot be empty.",
    chapterNotFound: "Chapter not found.",
    unableToLoadChapters: "Unable to load chapters.",
    topicNameEmpty: "Topic name cannot be empty.",
    topicNotFound: "Topic not found.",
    unableToLoadTopics: "Unable to load topics."
  },
  audit: {
    subtitle: "A record of sensitive actions taken across the school - who did what, and when.",
    emptyTitle: "No audit entries yet",
    emptyDescription:
      "Sensitive actions (creating accounts, approving papers, resolving alerts, changing settings) will show up here as they happen.",
    unknownActor: "Unknown"
  },
  papers: {
    subtitle: "Exam papers teachers have submitted. Approving or rejecting a paper happens on the coordinator side.",
    unknownClass: "Unknown class",
    unknownSubject: "Unknown subject",
    notFound: "Paper not found.",
    completeQualityCheck: "Complete every paper quality check before approval.",
    explainRejection: "Please explain what needs to change before rejecting a paper."
  },
  results: {
    subtitle: "Every completed test and how many students have been graded so far. Enter marks from a teacher's exam detail page.",
    emptyTitle: "No completed tests yet",
    emptyDescription: "Once a test is scheduled, submitted, and marked conducted, it will show up here for results tracking.",
    gradedSuffix: "graded"
  },
  reports: {
    subtitle: "Operational summaries computed from real data - syllabus coverage and teacher compliance.",
    syllabusCoverageByClass: "Syllabus coverage by class",
    teacherCompliance: "Teacher compliance",
    noTeachersYet: "No teachers yet.",
    subjectSingular: "subject",
    subjectsSuffix: "subjects",
    assignedSuffix: "assigned",
    noTestsYet: "No tests yet",
    papersSuffix: "papers"
  },
  performance: {
    subtitle: "Aggregate pass-rate analytics across classes, subjects, and topics.",
    emptyTitle: "No results yet",
    emptyDescription: "Performance analytics will appear here once teachers start entering test results.",
    unknownChapter: "Unknown chapter"
  }
} as const;

export default owner;
