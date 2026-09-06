/**
 * Principal-role Urdu dictionary. Must mirror the key shape of
 * lib/i18n/dictionaries/en/principal.ts exactly.
 */
const principal = {
  academicHealth: {
    roleLabel: "پرنسپل"
  },
  interventions: {
    title: "تعلیمی مداخلتیں",
    subtitle: "مداخلتوں، ذمہ داران اور نتائج پر اسکول گیر نگرانی۔",
    registerTitle: "مداخلتوں کا رجسٹر",
    noInterventions: "ابھی تک کوئی مداخلت درج نہیں کی گئی۔",
    studentRecord: "طالب علم کا ریکارڈ",
    due: "آخری تاریخ",
    noDueDate: "کوئی آخری تاریخ مقرر نہیں",
    outcomeLabel: "نتیجہ:"
  },
  dashboard: {
    welcomeBack: "خوش آمدید",
    moreUrgentAlert: "مزید فوری انتباہ",
    moreUrgentAlerts: "مزید فوری انتباہات",
    subjectNeedsChapters: "مضمون میں ابھی باب شامل کرنا باقی ہے۔",
    subjectsNeedChapters: "مضامین میں ابھی باب شامل کرنا باقی ہے۔",
    viewSyllabus: "نصاب دیکھیں"
  },
  scheduleStatus: {
    upcoming: "آئندہ",
    skipped: "نظرانداز شدہ",
    rescheduled: "نظرثانی شدہ"
  },
  common: {
    unknownClass: "نامعلوم جماعت",
    unknownSubject: "نامعلوم مضمون",
    unknownChapter: "نامعلوم باب"
  },
  attendance: {
    eyebrow: "شعبہ حاضری",
    title: "روزانہ حاضری کا جائزہ",
    subtitleSuffix:
      "اسکول گیر حاضری خودکار طور پر اپڈیٹ ہوتی ہے جب اساتذہ پہلے پیریڈ کی حاضری جمع کرواتے ہیں۔"
  },
  classes: {
    subtitle: "ہر جماعت اور سیکشن کے لیے ذمہ دار کلاس ٹیچر مقرر کریں۔"
  },
  students: {
    subtitle: "ہر جماعت اور سیکشن کے مطابق طلبہ کی فہرست کا انتظام کریں۔"
  },
  syllabus: {
    subtitle: "ہر جماعت کے مضامین، ابواب اور موضوعات۔ ترمیم مالک کی طرف سے کی جاتی ہے۔"
  },
  papers: {
    subtitle:
      "اساتذہ کی جانب سے جمع کروائے گئے امتحانی پرچے۔ پرچے کی منظوری یا مسترد کرنا کوآرڈینیٹر کی ذمہ داری ہے۔"
  },
  schedule: {
    subtitle:
      "جماعت اور مضمون کے لحاظ سے تمام مقرر کردہ ٹیسٹ۔ نیا شیڈول بنانا مالک کی ذمہ داری ہے۔",
    emptyDescription: "جیسے ہی کسی مضمون کے لیے ٹیسٹ مقرر ہوں گے، وہ یہاں ظاہر ہوں گے۔"
  },
  alerts: {
    subtitle:
      "پرچوں، ٹیسٹوں اور نتائج میں خودکار طور پر شناخت کیے گئے تعمیل کے مسائل۔ انتباہ حل کرنا مالک کی ذمہ داری ہے۔",
    open: "کھلے",
    resolved: "حل شدہ",
    noIssuesTitle: "فی الحال کوئی تعمیل کا مسئلہ نہیں",
    noIssuesDescription: "ہر پرچہ، ٹیسٹ اور نتیجہ درست سمت میں ہے۔",
    nothingResolvedTitle: "ابھی تک کچھ حل نہیں ہوا",
    nothingResolvedDescription: "مالک کی طرف سے حل شدہ انتباہات یہاں تاریخ کے طور پر محفوظ رہیں گے۔"
  },
  results: {
    subtitle: "ہر مکمل شدہ ٹیسٹ اور اب تک کتنے طلبہ کے نمبر درج ہو چکے ہیں۔",
    emptyTitle: "ابھی تک کوئی ٹیسٹ مکمل نہیں ہوا",
    emptyDescription:
      "جیسے ہی کوئی ٹیسٹ مقرر، جمع اور منعقد شدہ کے طور پر نشان زد ہو گا، یہ نتائج کی نگرانی کے لیے یہاں ظاہر ہو گا۔",
    graded: "نمبر درج"
  },
  reports: {
    subtitle: "حقیقی ڈیٹا سے تیار کردہ آپریشنل خلاصے - نصاب کی تکمیل اور اساتذہ کی تعمیل۔",
    syllabusCoverageByClass: "جماعت کے لحاظ سے نصاب کی تکمیل",
    subjectsLabel: "مضامین",
    noTeachersYet: "ابھی تک کوئی استاد موجود نہیں۔",
    subjectAssigned: "مضمون تفویض شدہ",
    subjectsAssigned: "مضامین تفویض شدہ",
    noTestsYet: "ابھی تک کوئی ٹیسٹ نہیں",
    papersLabel: "پرچے"
  },
  performance: {
    subtitle: "جماعتوں، مضامین اور موضوعات میں مجموعی پاس ریٹ کا تجزیہ۔",
    emptyTitle: "ابھی تک کوئی نتیجہ نہیں",
    emptyDescription: "جیسے ہی اساتذہ ٹیسٹ کے نتائج درج کرنا شروع کریں گے، کارکردگی کا تجزیہ یہاں ظاہر ہوگا۔"
  },
  messages: {
    noOwnerTitle: "مالک کا اکاؤنٹ نہیں ملا",
    noOwnerDescription: "ابھی تک پیغام بھیجنے کے لیے کوئی مالک اکاؤنٹ موجود نہیں۔",
    noMessagesTitle: "ابھی تک کوئی پیغام نہیں",
    noMessagesDescription: "اسکول کے مالک کے ساتھ آپ کی گفتگو یہاں ظاہر ہوگی۔",
    replyLabel: "جواب",
    placeholder: "اسکول کے مالک کو پیغام لکھیں...",
    send: "بھیجیں",
    emptyBody: "پیغام خالی نہیں ہو سکتا۔",
    ownerNotFound: "پیغام بھیجنے کے لیے اسکول کا مالک نہیں مل سکا۔"
  }
} as const;

export default principal;
