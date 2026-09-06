/**
 * Urdu translations for the alert-type/severity label dictionary. Must
 * implement exactly the same key shape as dictionaries/en/alerts.ts.
 */
const alerts = {
  types: {
    paperMissing: "پرچہ موجود نہیں",
    paperDeadlineApproaching: "پرچے کی آخری تاریخ قریب ہے",
    paperRejected: "پرچہ مسترد کر دیا گیا",
    testOverdue: "ٹیسٹ کی مقررہ تاریخ گزر گئی",
    testNotConducted: "ٹیسٹ منعقد نہیں ہوا",
    resultsMissing: "نتائج موجود نہیں",
    resultsOverdue: "نتائج کی مقررہ تاریخ گزر گئی",
    syllabusBehind: "نصاب شیڈول سے پیچھے ہے",
    teacherComplianceWarning: "استاد کی تعمیل سے متعلق انتباہ",
    studentPerformanceWarning: "طالب علم کی کارکردگی سے متعلق انتباہ",
    classPerformanceWarning: "جماعت کی کارکردگی سے متعلق انتباہ",
    subjectPerformanceWarning: "مضمون کی کارکردگی سے متعلق انتباہ",
    paperPrinted: "پرچے کی پرنٹنگ سے متعلق اپ ڈیٹ"
  },
  severity: {
    info: "معلومات",
    warning: "انتباہ",
    urgent: "فوری",
    critical: "نازک"
  },
  resolve: "حل کریں",
  teacherLabel: "استاد:",
  resolvedPrefix: "حل شدہ",
  justNow: "ابھی ابھی",
  minutesAgoSuffix: " منٹ پہلے",
  hoursAgoSuffix: " گھنٹے پہلے",
  daysAgoSuffix: " دن پہلے"
} as const;

export default alerts;
