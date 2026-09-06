/**
 * Urdu translations for the leadership-facing attendance components
 * dictionary. Must implement exactly the same key shape as
 * dictionaries/en/attendanceLeadership.ts.
 */
const attendanceLeadership = {
  staffForm: {
    eyebrow: "عملے کی حاضری",
    subtitle: "کوآرڈینیٹر عملے کی مکمل حاضری درج کرتا ہے۔",
    present: "حاضر",
    absent: "غیر حاضر",
    late: "تاخیر سے آنے والے",
    saving: "محفوظ ہو رہا ہے…",
    saved: "عملے کی حاضری محفوظ ہو گئی",
    saveButton: "عملے کی حاضری محفوظ کریں",
    saveError: "عملے کی حاضری محفوظ نہیں ہو سکی۔"
  },
  staffSummary: {
    eyebrow: "عملے کی حاضری",
    rollTitlePrefix: "عملے کی حاضری",
    present: "حاضر",
    absent: "غیر حاضر",
    missing: "درج نہیں",
    notMarked: "نشان زد نہیں",
    noActiveStaff: "عملے کا کوئی فعال ریکارڈ موجود نہیں۔",
    statusLabel: {
      present: "حاضر",
      absent: "غیر حاضر",
      late: "تاخیر سے",
      leave: "چھٹی پر",
      excused: "معذور"
    }
  },
  dailyReport: {
    statSchoolAttendance: "اسکول کی حاضری",
    statStudents: "طلبہ",
    statAbsent: "غیر حاضر",
    statLate: "تاخیر سے آنے والے",
    notSubmittedEyebrow: "حاضری جمع نہیں کی گئی",
    notSubmittedDescription:
      "ان کلاس ٹیچرز نے درج ذیل تاریخ کے لیے پہلے پیریڈ کی حاضری مکمل نہیں کی:",
    assignedTeacher: "مقرر کردہ استاد:",
    classAttendanceTitlePrefix: "جماعت کی حاضری",
    liveReportDescription:
      "براہ راست اسکول بھر کی رپورٹ۔ جمع کردہ حاضری فوری طور پر مجاز قیادت کو دستیاب ہوتی ہے۔",
    colClass: "جماعت",
    colStudents: "طلبہ",
    colPresent: "حاضر",
    colAbsent: "غیر حاضر",
    colLate: "تاخیر",
    colRate: "شرح",
    colStatus: "حیثیت",
    statusSubmitted: "جمع شدہ",
    statusActionNeeded: "کارروائی درکار",
    noAttendanceSubmitted: "اس تاریخ کے لیے کوئی حاضری جمع نہیں کی گئی۔"
  },
  bridge: {
    eyebrow: "تعلیمی امور",
    title: "حاضری ↔ امتحانات",
    description:
      "روزانہ کی حاضری تعلیمی خطرے کی وضاحت کرتی ہے؛ امتحانی حاضری بتاتی ہے کہ نتیجہ موجود ہونا چاہیے یا نہیں۔",
    openAttendanceCenter: "حاضری سینٹر کھولیں",
    latestAttendance: "تازہ ترین حاضری",
    vsPreviousDay: "گزشتہ دن کے مقابلے میں",
    studentsNeedingAttention: "توجہ طلب طلبہ",
    attendanceAcademicSignals: "حاضری / تعلیمی اشارے",
    examResultExceptions: "امتحانی نتائج کی استثنائیں",
    presentInExamResultMissing: "امتحان میں حاضر، نتیجہ موجود نہیں",
    teachersNeedingAttention: "توجہ طلب اساتذہ",
    attendanceSubmissionCompliance: "حاضری جمع کروانے کی تعمیل",
    trendTitle: "14 روزہ حاضری رجحان",
    trendSubtitle: "اسکول بھر میں جمع شدہ پہلے پیریڈ کی حاضری",
    daysSuffix: "دن",
    noSubmittedDays: "ابھی تک کسی دن کی حاضری جمع نہیں کی گئی۔",
    attendanceLabel: "حاضری",
    assessmentLabel: "تشخیص",
    noStudentSignal: "فی الحال طلبہ کے لیے کوئی مشترکہ خطرے کا اشارہ موجود نہیں۔",
    teacherComplianceTitle: "اساتذہ کی حاضری تعمیل",
    classDaysSubmitted: "کلاس کے دن جمع کیے گئے",
    allTeachersCompliant: "تمام زیرِ نگرانی کلاس ٹیچرز 90 فیصد یا اس سے زیادہ تعمیل پر ہیں۔",
    examExceptionsTitle: "امتحانی استثنائیں",
    resultMissing: "نتیجہ موجود نہیں",
    noResultExceptions: "کوئی نتیجہ استثنیٰ نہیں ملی۔",
    signalAttendanceAndAcademic: "حاضری اور تعلیمی مسئلہ",
    signalAttendancePrimary: "حاضری کا مسئلہ",
    signalAcademicDespiteAttendance: "حاضری کے باوجود تعلیمی مسئلہ",
    signalNormal: "معمول کے مطابق"
  }
} as const;

export default attendanceLeadership;
