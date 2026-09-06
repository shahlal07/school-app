/**
 * Urdu counterpart of en/teacher.ts. Must implement the exact same key
 * shape. Wording targets clear, professional Pakistani-school Urdu,
 * matching core.ts's register.
 */
const teacher = {
  teacher: {
    home: {
      eyebrow: "استاد ڈیش بورڈ",
      greeting: "ہیلو",
      fallbackName: "",
      subtitle: "آپ کی تدریس، امتحانات اور پیروی کے کام ایک ہی جگہ۔",
      classTeacherBadgePrefix: "کلاس ٹیچر",
      statTodayClasses: "آج کی کلاسیں",
      statPaperActions: "پرچے کے اقدامات",
      statMarksPending: "نمبر درج کرنا باقی",
      statNeedsAttention: "توجہ درکار",
      openExamWorkspace: "امتحانی ورک اسپیس کھولیں",
      openMessages: "پیغامات کھولیں",
      examReadinessHeading: "امتحانی تیاری · اگلے 7 دن",
      printedCountSuffix: "پرچہ جات پہلے ہی پرنٹ شدہ کے طور پر نشان زد ہیں۔",
      seeAll: "سب دیکھیں",
      todaysScheduleHeading: "آج کا نظام الاوقات",
      viewWeek: "ہفتہ دیکھیں",
      emptyTodayTitle: "آج کچھ بھی طے نہیں ہے",
      emptyTodayNoSubjects: "ابھی تک کوئی مضمون تفویض نہیں کیا گیا۔",
      emptyTodayBreak: "آرام کریں۔ آپ کے اگلے امتحانی کام اوپر دکھائے گئے ہیں۔",
      classFallback: "جماعت",
      subjectFallback: "مضمون"
    },
    testType: {
      topic: "موضوعی ٹیسٹ",
      chapter: "بابی ٹیسٹ",
      revision: "دہرائی",
      monthly: "ماہانہ",
      midterm: "وسط مدتی",
      terminal: "ٹرمینل",
      final: "حتمی",
      custom: "مخصوص"
    },
    schedule: {
      statusUpcoming: "آئندہ",
      statusSkipped: "نظر انداز شدہ",
      statusRescheduled: "دوبارہ شیڈول شدہ"
    },
    exams: {
      subtitle: "آپ کے مقررہ ٹیسٹ، تاریخ کے لحاظ سے گروپ کیے گئے۔",
      emptyTitle: "ابھی تک کوئی امتحان تفویض نہیں ہوا",
      emptyDescription:
        "آپ کو ابھی تک کوئی مضمون تفویض نہیں کیا گیا، اس لیے شیڈول کرنے کے لیے کچھ نہیں ہے۔ جب اسکول کا مالک آپ کو کسی مضمون پر مقرر کرے گا، تو آپ کے آئندہ ٹیسٹ یہاں ظاہر ہوں گے۔",
      sectionToday: "آج",
      sectionThisWeek: "اس ہفتے",
      sectionUpcoming: "آئندہ",
      sectionPast: "گزشتہ"
    },
    examDetail: {
      backToExams: "امتحانات کی طرف واپس",
      examNotFound: "امتحان نہیں ملا۔"
    },
    paperEditor: {
      returnedNotice:
        "یہ پرچہ تبدیلی کے لیے واپس کیا گیا تھا۔ دوبارہ جمع کروانے سے ایک نیا حتمی ورژن بن جائے گا؛ پرانا ورژن تاریخ میں محفوظ رہے گا۔",
      contentLabel: "پرچے کا مواد (فائل اپ لوڈ کرتے وقت اختیاری)",
      contentPlaceholder: "امتحانی پرچے کا متن یہاں لکھیں یا پیسٹ کریں...",
      fileLabel: "پرچے کی فائل",
      fileHint: "(پی ڈی ایف، ورڈ، یا پرچے کی تصویر - زیادہ سے زیادہ 15 ایم بی)",
      saveDraft: "مسودہ محفوظ کریں",
      submitPaper: "پرچہ جمع کروائیں",
      lockedNotice:
        "یہ جمع کروایا گیا پرچہ مقفل ہے۔ جائزے کے بعد، تبدیلیاں مسترد شدہ پرچے پر نظرثانی کر کے نئے ورژن کی صورت میں کی جاتی ہیں۔",
      toastDraftSaved: "مسودہ محفوظ ہو گیا",
      toastSubmitted: "پرچہ کوآرڈینیٹر کے جائزے کے لیے جمع کروا دیا گیا۔",
      contentEmpty: "پرچے کا مواد خالی نہیں ہو سکتا۔",
      papersLocked: "جمع شدہ پرچے مقفل ہیں۔ جائزے کا انتظار کریں یا مسترد شدگی کے نوٹس کی روشنی میں نظرثانی کریں۔",
      contentEmptyBeforeSubmit: "جمع کروانے سے پہلے پرچے کا مواد خالی نہیں ہو سکتا۔",
      alreadySubmittedLocked: "یہ پرچہ پہلے ہی جمع کروایا جا چکا ہے اور جائزے تک مقفل ہے۔",
      versionError: "پرچے کا اگلا ورژن معلوم نہیں کیا جا سکا۔",
      chooseFile: "پی ڈی ایف، ورڈ دستاویز، یا پرچے کی تصویر منتخب کریں۔",
      fileTooLarge: "پرچہ 15 ایم بی یا اس سے کم ہونا چاہیے۔",
      fileTypeInvalid: "پی ڈی ایف، ورڈ دستاویز، یا تصویر (JPEG/PNG/HEIC/WEBP) اپ لوڈ کریں۔",
      notAssigned: "آپ اس امتحان پر مقرر نہیں ہیں۔"
    },
    paperTimeline: {
      heading: "پرچے کی تاریخ",
      versionLabel: "ورژن",
      versionActiveSuffix: "فعال جمع کروائی گئی کاپی ہے۔",
      openPaper: "پرچہ کھولیں",
      done: "مکمل",
      waiting: "منتظر",
      latestReviewNote: "تازہ ترین جائزہ نوٹ",
      versionsHeading: "ورژنز",
      printRecordsHeading: "پرنٹ ریکارڈ",
      queuedForPrinting: "پرنٹنگ کے لیے قطار میں",
      copiesLabel: "کاپیاں",
      colorLabel: "رنگین",
      bwLabel: "بلیک اینڈ وائٹ",
      duplexLabel: "دو رخی",
      singleSidedLabel: "یک رخی",
      queuedOn: "قطار میں لگایا گیا",
      reprintLabel: "دوبارہ پرنٹ:"
    },
    resultsRoster: {
      totalMarksLabel: "کل نمبر",
      searchLabel: "طلبہ تلاش کریں",
      searchPlaceholder: "رول نمبر یا نام...",
      rollPrefix: "رول # ",
      examAbsentBadge: "امتحان میں غیر حاضر · نتیجہ درکار نہیں",
      pass: "پاس",
      fail: "فیل",
      absentLabel: "غیر حاضر",
      saveAll: "سب محفوظ کریں",
      submitForReview: "جائزے کے لیے نتائج جمع کروائیں",
      noStudents: "اس جماعت کے لیے کوئی طالب علم نہیں ملا۔",
      invalidTotalMarks: "پہلے کل نمبر کی درست قدر درج کریں۔",
      toastSaved: "نتائج محفوظ ہو گئے",
      toastSubmitted: "نتائج کوآرڈینیٹر کے جائزے کے لیے جمع کروا دیے گئے",
      totalMarksPositive: "کل نمبر ایک مثبت عدد ہونا چاہیے۔",
      marksRangePrefix: "نمبر 0 اور",
      noActiveStudents: "اس جماعت میں کوئی فعال طالب علم شامل نہیں ہے۔",
      enterAllResultsPrefix: "جمع کروانے سے پہلے تمام",
      enterAllResultsSuffix: "طلبہ کے نتائج درج کریں۔",
      everyPresentNeedsMarks: "ہر حاضر طالب علم کے نمبر جمع کروانے سے پہلے درج ہونے چاہئیں۔",
      notOwner: "یہ نتیجہ جمع کروانا آپ کا اختیار نہیں ہے۔",
      alreadySubmitted: "نتائج پہلے ہی جمع کروائے جا چکے ہیں۔"
    },
    alerts: {
      subtitle: "آپ کی جماعتوں کے لیے تعمیل کے مسائل جن سے اسکول کے مالک کو آگاہ کیا گیا ہے۔",
      openHeading: "کھلے",
      resolvedHeading: "حل شدہ",
      emptyTitle: "آپ مکمل طور پر اپ ڈیٹ ہیں",
      emptyDescription:
        "اس وقت آپ کے لیے کوئی کھلا تعمیلی مسئلہ نہیں ہے۔ جیسے ہی پرچے، ٹیسٹ اور نتائج ٹریک ہوں گے یہ خودکار طور پر اپ ڈیٹ ہو جائے گا۔"
    },
    profile: {
      classTeacherOfPrefix: "کلاس ٹیچر برائے",
      assignedSubjects: "تفویض شدہ مضامین",
      noSubjects: "ابھی تک کوئی مضمون تفویض نہیں کیا گیا - اسکول کے مالک سے رابطہ کریں۔",
      unknownSubject: "نامعلوم مضمون",
      unknownClass: "نامعلوم جماعت",
      footerNote: "پاس ورڈ ری سیٹ یا مضمون کی تبدیلی درکار ہے؟ براہ راست اسکول کے مالک سے رابطہ کریں۔"
    },
    messages: {
      emptyTitle: "ابھی تک کوئی پیغام نہیں",
      emptyDescription: "اسکول کے مالک کے ساتھ آپ کی گفتگو یہاں ظاہر ہوگی۔",
      replyLabel: "جواب",
      replyPlaceholder: "اسکول کے مالک کو پیغام لکھیں...",
      send: "بھیجیں",
      toastSent: "پیغام بھیج دیا گیا",
      messageEmpty: "پیغام خالی نہیں ہو سکتا۔",
      ownerNotFound: "اسکول کا مالک تلاش نہیں کیا جا سکا۔"
    },
    attendance: {
      eyebrow: "شعبہ حاضری",
      sectionFallback: "سیکشن",
      noClassTitle: "کوئی جماعت تفویض نہیں",
      noClassDescription:
        "کوآرڈینیٹر سے درخواست کریں کہ آپ کو کلاس ٹیچر مقرر کیا جائے۔ حاضری اسی تفویض سے منسلک ہے۔",
      firstPeriodLabel: "پہلا پیریڈ",
      activeStudentsSuffix: "فعال طلبہ",
      rollNumberNote: "رول نمبر کلاس روم کی شناخت ہے۔ طالب علم کی شناخت ڈیٹا بیس میں محفوظ رہتی ہے۔",
      presentLabel: "حاضر",
      absentLabel: "غیر حاضر",
      lateLabel: "تاخیر سے",
      excusedLabel: "معذور",
      studentsSuffix: "طلبہ",
      classForm: {
        eyebrow: "پہلے پیریڈ کی حاضری",
        subtitle: "صرف استثنائی صورتحال درج کریں۔ ہر طالب علم بطور ڈیفالٹ حاضر شمار ہوگا۔",
        errorSaving: "حاضری محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں یا کوآرڈینیٹر سے رابطہ کریں۔",
        submittedMessage: "حاضری جمع کروا دی گئی۔",
        submittedSubMessage: "اب کوآرڈینیٹر، پرنسپل اور مالک اسے دیکھ سکتے ہیں۔",
        submitting: "حاضری جمع کروائی جا رہی ہے…",
        submitPrefix: "حاضری جمع کروائیں"
      },
      examForm: {
        eyebrow: "امتحانی حاضری",
        subtitle: "وہی رول نمبر فہرست استعمال کریں۔ بطور ڈیفالٹ حاضر؛ صرف استثنائی صورتحال درج کریں۔",
        searchPlaceholder: "رول نمبر یا طالب علم کا نام تلاش کریں",
        searchAriaLabel: "امتحانی حاضری کی فہرست تلاش کریں",
        noMatch: "اس تلاش سے کوئی طالب علم نہیں ملا۔",
        errorSaving: "امتحانی حاضری محفوظ نہیں ہو سکی۔",
        submittedMessage: "امتحانی حاضری درج ہو گئی۔",
        submittedSubMessage: "غیر حاضر/معذور نشان زد طلبہ کو نتیجے کی مطابقت میں الگ سے دیکھا جائے گا۔",
        submitting: "امتحانی حاضری جمع کروائی جا رہی ہے…",
        submitPrefix: "امتحانی حاضری جمع کروائیں"
      }
    }
  }
};

export default teacher;
