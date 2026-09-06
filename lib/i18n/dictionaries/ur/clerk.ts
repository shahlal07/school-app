/**
 * Clerk-role Urdu dictionary. Must mirror the key shape of
 * lib/i18n/dictionaries/en/clerk.ts exactly.
 */
const clerk = {
  home: {
    title: "کلرک ڈیسک",
    subtitle: "داخلے اور طلبہ کے ریکارڈ کا انتظام۔",
    rosterByClass: "جماعت کے مطابق فہرست",
    noClassesFound: "ابھی تک کوئی جماعت موجود نہیں۔",
    studentsSuffix: "طلبہ",
    manageStudents: "طلبہ کا انتظام کریں",
    staffRecords: "عملے کے ریکارڈ",
    staffRecordsDescription: "تدریسی عملے کے لیے عہدہ اور تاریخِ شمولیت مقرر کریں۔",
    openStaffList: "عملے کی فہرست کھولیں"
  },
  students: {
    title: "طلبہ",
    subtitle: "ہر جماعت اور سیکشن کے مطابق طلبہ کی فہرست کا انتظام کریں۔"
  },
  staff: {
    title: "عملہ",
    subtitle: "تدریسی عملے کا ریکارڈ: عہدہ اور تاریخِ شمولیت۔",
    noStaffTitle: "ابھی تک کوئی تدریسی عملہ موجود نہیں",
    noStaffDescription: "استاد کے اکاؤنٹس مالک کی طرف سے Owner > Teachers سے بنائے جاتے ہیں۔",
    inactive: "غیر فعال",
    designationLabel: "عہدہ",
    joiningDateLabel: "تاریخِ شمولیت",
    editRecord: "ریکارڈ میں ترمیم کریں",
    editDialogTitlePrefix: "عملے کے ریکارڈ میں ترمیم کریں",
    editDialogDescription: "set_staff_record_fields فنکشن کے ذریعے عہدہ اور تاریخِ شمولیت مقرر کرتا ہے۔",
    designationInputPlaceholder: "مثلاً سینئر ٹیچر، ہیڈ آف سائنس",
    toastUpdated: "عملے کا ریکارڈ اپ ڈیٹ ہو گیا"
  },
  papers: {
    title: "امتحانی پرنٹنگ",
    subtitle:
      "اساتذہ کی جانب سے جمع کروائے گئے پرچے۔ انہیں کھولیں، پرنٹنگ کے لیے بھیجیں، پھر فزیکل پرنٹ مکمل ہونے پر نشان زد کریں۔",
    noPapersTitle: "ابھی تک کوئی امتحانی پرچہ موجود نہیں",
    noPapersDescription: "اساتذہ کے جمع کردہ پرچے یہاں خودکار طور پر ظاہر ہوں گے۔",
    paperFileMissing: "پرچے کی فائل موجود نہیں ہے۔",
    waitingForApproval: "کوآرڈینیٹر کی منظوری کا انتظار ہے",
    placedInQueue: "پرنٹ قطار میں شامل کر دیا گیا",
    markedPrinted: "پرنٹ شدہ نشان زد کر دیا گیا۔ استاد اور کوآرڈینیٹر کو مطلع کر دیا گیا ہے۔",
    reprintQueued: "دوبارہ پرنٹ آڈٹ وجہ کے ساتھ قطار میں شامل کر دیا گیا",
    reprintReasonPrompt: "یہ پرچہ دوبارہ کیوں پرنٹ کیا جا رہا ہے؟",
    reprintCopiesPrompt: "کتنی کاپیاں؟",
    invalidCopyCount: "کاپیوں کی درست تعداد درج کریں۔",
    copiesLabel: "کاپیاں",
    colorLabel: "رنگ",
    colorBw: "بلیک اینڈ وائٹ",
    colorColor: "رنگین",
    sidesLabel: "اطراف",
    sidesDouble: "دو طرفہ",
    sidesSingle: "یک طرفہ",
    pagesLabel: "صفحات",
    pagesPlaceholder: "اختیاری",
    priorityLabel: "ترجیح",
    priorityNormal: "عام",
    priorityHigh: "زیادہ",
    priorityUrgent: "فوری",
    priorityLow: "کم",
    placeForPrinting: "پرنٹنگ کے لیے بھیجیں",
    markPrinted: "پرنٹ شدہ نشان زد کریں",
    queueReprint: "دوبارہ پرنٹ قطار میں شامل کریں",
    statusQueued: "قطار میں",
    paperPrefix: "پرچہ",
    examFallback: "امتحان",
    unknownClass: "نامعلوم جماعت",
    unknownSubject: "نامعلوم مضمون",
    unknownTeacher: "نامعلوم استاد",
    copiesUnit: "کاپیاں",
    pagesUnit: "صفحات",
    prioritySuffix: "ترجیح"
  }
} as const;

export default clerk;
