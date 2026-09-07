import ExcelJS from "exceljs";
import type {
  ExamSetReport,
  ExamSetSubjectSlot,
  ResultInput,
  StudentInput
} from "@/lib/examination/exam-set-analytics";
import type { Locale } from "@/lib/i18n/types";

type Translator = (key: string) => string;

/**
 * Builds the printable Excel workbook for one completed exam set (Phase E
 * of the continuous exam-set model). Reuses the already-computed
 * ExamSetReport (lib/examination/exam-set-analytics.ts) for every aggregate
 * sheet, and the same raw subjects/students/results rows for the one sheet
 * that needs a full per-student-per-subject matrix (Student Rankings),
 * since the report only carries per-student totals, not the per-subject
 * breakdown a printed roster needs.
 */

export interface ExamSetWorkbookMeta {
  schoolName: string;
  className: string;
  setNumber: number;
  assessmentScope: string;
  startedOn: string | null;
  completedOn: string | null;
  finalizedByName: string | null;
  generatedAt: Date;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F6F5C" }
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };

function applyLandscapePrint(ws: ExcelJS.Worksheet, printTitle: string): void {
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  ws.headerFooter.oddHeader = `&L&B${printTitle}&R&D`;
  ws.headerFooter.oddFooter = "&CPage &P of &N";
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 20;
}

function pct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export async function buildExamSetWorkbook(
  meta: ExamSetWorkbookMeta,
  report: ExamSetReport,
  subjects: ExamSetSubjectSlot[],
  students: StudentInput[],
  results: ResultInput[],
  t: Translator,
  locale: Locale
): Promise<Buffer> {
  const wb = "coordinator.examSetWorkbook.";
  const rtl = locale === "ur";
  const dash = t(`${wb}dash`);
  const assessmentScopeLabel =
    t(`coordinator.examSetReport.assessmentScopeLabel.${meta.assessmentScope}`) ||
    meta.assessmentScope.replace(/_/g, " ");

  function sheetView() {
    return rtl ? { showGridLines: false, rightToLeft: true } : { showGridLines: false };
  }
  function frozenSheetView() {
    return rtl
      ? { state: "frozen" as const, ySplit: 1, showGridLines: false, rightToLeft: true }
      : { state: "frozen" as const, ySplit: 1, showGridLines: false };
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.schoolName;
  workbook.created = meta.generatedAt;
  const printTitle = `${meta.schoolName} — ${meta.className} — ${t(`${wb}examSetPrefix`)} #${meta.setNumber}`;

  // ---- Sheet 1: Executive Summary ----
  const summary = workbook.addWorksheet(t(`${wb}sheetExecutiveSummary`), { views: [sheetView()] });
  applyLandscapePrint(summary, printTitle);
  summary.columns = [{ width: 28 }, { width: 40 }];
  const summaryRows: [string, string][] = [
    [t(`${wb}labelSchool`), meta.schoolName],
    [t(`${wb}labelExamSet`), `#${meta.setNumber}`],
    [t(`${wb}labelClass`), meta.className],
    [t(`${wb}labelAssessmentStage`), assessmentScopeLabel],
    [t(`${wb}labelPeriod`), `${meta.startedOn ?? dash} ${t(`${wb}to`)} ${meta.completedOn ?? dash}`],
    [t(`${wb}labelSubjectsCompleted`), `${subjects.length}`],
    [t(`${wb}labelStudents`), `${report.totalStudents}`],
    [t(`${wb}labelOverallAverage`), pct(report.overallAverage)],
    [t(`${wb}labelOverallPassRate`), pct(report.overallPassRate)],
    [
      t(`${wb}labelTopPerformer`),
      report.rankings[0]
        ? `${report.rankings[0].name} (#${report.rankings[0].rollNo}) — ${report.rankings[0].percentage}%`
        : dash
    ],
    [
      t(`${wb}labelWeakestSubject`),
      report.weakestSubject ? `${report.weakestSubject.subjectName} — ${pct(report.weakestSubject.average)}` : dash
    ],
    [
      t(`${wb}labelStrongestSubject`),
      report.strongestSubject ? `${report.strongestSubject.subjectName} — ${pct(report.strongestSubject.average)}` : dash
    ],
    [t(`${wb}labelStudentsRequiringAttention`), `${report.studentsRequiringAttention.length}`],
    [t(`${wb}labelGenerated`), meta.generatedAt.toISOString().slice(0, 19).replace("T", " ")],
    [t(`${wb}labelFinalizedBy`), meta.finalizedByName ?? dash]
  ];
  for (const [label, value] of summaryRows) {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }
  summary.addRow([]);
  summary.addRow([t(`${wb}signOff`), "________________________"]);

  // ---- Sheet 2: Student Rankings (full roster, per-subject matrix) ----
  const rankSheet = workbook.addWorksheet(t(`${wb}sheetStudentRankings`), { views: [frozenSheetView()] });
  applyLandscapePrint(rankSheet, printTitle);
  const sortedSubjects = [...subjects].sort((a, b) => a.sequence - b.sequence);
  const rankHeader = [
    t(`${wb}colRank`),
    t(`${wb}colRollNo`),
    t(`${wb}colStudent`),
    ...sortedSubjects.map((s) => s.subjectName),
    t(`${wb}colTotal`),
    t(`${wb}colPercentage`),
    t(`${wb}colStatus`)
  ];
  rankSheet.columns = rankHeader.map((h, i) => ({
    header: h,
    width: i < 3 ? 20 : i >= rankHeader.length - 3 ? 14 : 16
  }));
  styleHeaderRow(rankSheet.getRow(1));
  rankSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: rankHeader.length } };

  const resultsByScheduleAndStudent = new Map<string, ResultInput>();
  for (const r of results) resultsByScheduleAndStudent.set(`${r.scheduleItemId}:${r.studentId}`, r);

  report.rankings.forEach((ranking, index) => {
    const subjectCells = sortedSubjects.map((slot) => {
      if (!slot.scheduleItemId) return dash;
      const r = resultsByScheduleAndStudent.get(`${slot.scheduleItemId}:${ranking.studentId}`);
      if (!r) return dash;
      if (r.isAbsent) return t(`${wb}absent`);
      return r.marksObtained ?? dash;
    });
    const row = rankSheet.addRow([
      index + 1,
      ranking.rollNo,
      ranking.name,
      ...subjectCells,
      `${ranking.totalObtained}/${ranking.totalPossible}`,
      `${ranking.percentage}%`,
      ranking.subjectFailures > 0 ? `${ranking.subjectFailures} ${t(`${wb}failedSuffix`)}` : t(`${wb}pass`)
    ]);
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7F5" } };
      });
    }
  });

  // ---- Sheet 3: Subject Analysis ----
  const subjectSheet = workbook.addWorksheet(t(`${wb}sheetSubjectAnalysis`), { views: [frozenSheetView()] });
  applyLandscapePrint(subjectSheet, printTitle);
  subjectSheet.columns = [
    { header: t(`${wb}colSubject`), key: "subject", width: 22 },
    { header: t(`${wb}colTeacher`), key: "teacher", width: 20 },
    { header: t(`${wb}colAverage`), key: "average", width: 12 },
    { header: t(`${wb}colPassRate`), key: "passRate", width: 12 },
    { header: t(`${wb}colHighest`), key: "highest", width: 12 },
    { header: t(`${wb}colLowest`), key: "lowest", width: 12 },
    { header: t(`${wb}colFailures`), key: "failures", width: 10 },
    { header: t(`${wb}colGraded`), key: "graded", width: 10 },
    { header: t(`${wb}colChangeVsPreviousSet`), key: "change", width: 20 }
  ];
  styleHeaderRow(subjectSheet.getRow(1));
  for (const s of report.subjects) {
    subjectSheet.addRow({
      subject: s.subjectName,
      teacher: s.teacherName ?? t(`${wb}unassigned`),
      average: pct(s.average),
      passRate: pct(s.passRate),
      highest: pct(s.highest),
      lowest: pct(s.lowest),
      failures: s.failureCount,
      graded: `${s.gradedCount}/${s.totalStudents}`,
      change:
        s.changeVsPreviousSet === null
          ? t(`${wb}firstSet`)
          : `${s.changeVsPreviousSet > 0 ? "+" : ""}${s.changeVsPreviousSet} ${t(`${wb}ppSuffix`)}`
    });
  }

  // ---- Sheet 4: Teacher Performance ----
  const teacherSheet = workbook.addWorksheet(t(`${wb}sheetTeacherPerformance`), { views: [frozenSheetView()] });
  applyLandscapePrint(teacherSheet, printTitle);
  teacherSheet.columns = [
    { header: t(`${wb}colTeacher`), key: "teacher", width: 22 },
    { header: t(`${wb}colClass`), key: "klass", width: 14 },
    { header: t(`${wb}colSubject`), key: "subject", width: 20 },
    { header: t(`${wb}labelStudents`), key: "students", width: 12 },
    { header: t(`${wb}colAverage`), key: "average", width: 12 },
    { header: t(`${wb}colPassRate`), key: "passRate", width: 12 },
    { header: t(`${wb}colChangeVsPreviousSet`), key: "change", width: 20 }
  ];
  styleHeaderRow(teacherSheet.getRow(1));
  for (const s of report.subjects) {
    teacherSheet.addRow({
      teacher: s.teacherName ?? t(`${wb}unassigned`),
      klass: meta.className,
      subject: s.subjectName,
      students: s.totalStudents,
      average: pct(s.average),
      passRate: pct(s.passRate),
      change:
        s.changeVsPreviousSet === null
          ? t(`${wb}firstSet`)
          : `${s.changeVsPreviousSet > 0 ? "+" : ""}${s.changeVsPreviousSet} ${t(`${wb}ppSuffix`)}`
    });
  }

  // ---- Sheet 5: At-Risk Students ----
  const riskSheet = workbook.addWorksheet(t(`${wb}sheetAtRiskStudents`), { views: [frozenSheetView()] });
  applyLandscapePrint(riskSheet, printTitle);
  riskSheet.columns = [
    { header: t(`${wb}colRollNo`), key: "rollNo", width: 14 },
    { header: t(`${wb}colStudent`), key: "name", width: 24 },
    { header: t(`${wb}colPercentage`), key: "percentage", width: 14 },
    { header: t(`${wb}colSubjectFailures`), key: "failures", width: 16 },
    { header: t(`${wb}colReason`), key: "reason", width: 46 }
  ];
  styleHeaderRow(riskSheet.getRow(1));
  if (report.studentsRequiringAttention.length === 0) {
    riskSheet.addRow([dash, t(`${wb}noStudentsFlaggedThisSet`), dash, dash, dash]);
  } else {
    for (const s of report.studentsRequiringAttention) {
      riskSheet.addRow({
        rollNo: s.rollNo,
        name: s.name,
        percentage: `${s.percentage}%`,
        failures: s.subjectFailures,
        reason: s.reason
      });
    }
  }

  // ---- Sheet 6: Top Performers ----
  const topSheet = workbook.addWorksheet(t(`${wb}sheetTopPerformers`), { views: [frozenSheetView()] });
  applyLandscapePrint(topSheet, printTitle);
  topSheet.columns = [
    { header: t(`${wb}colRank`), key: "rank", width: 10 },
    { header: t(`${wb}colRollNo`), key: "rollNo", width: 14 },
    { header: t(`${wb}colStudent`), key: "name", width: 24 },
    { header: t(`${wb}colTotal`), key: "total", width: 16 },
    { header: t(`${wb}colPercentage`), key: "percentage", width: 14 }
  ];
  styleHeaderRow(topSheet.getRow(1));
  report.rankings.slice(0, 20).forEach((r, index) => {
    topSheet.addRow({
      rank: index + 1,
      rollNo: r.rollNo,
      name: r.name,
      total: `${r.totalObtained}/${r.totalPossible}`,
      percentage: `${r.percentage}%`
    });
  });

  // ---- Sheet 7: Exceptions ----
  const exceptionsSheet = workbook.addWorksheet(t(`${wb}sheetExceptions`), { views: [frozenSheetView()] });
  applyLandscapePrint(exceptionsSheet, printTitle);
  exceptionsSheet.columns = [
    { header: t(`${wb}colSubject`), key: "subject", width: 22 },
    { header: t(`${wb}colStudent`), key: "student", width: 24 },
    { header: t(`${wb}colRollNo`), key: "rollNo", width: 14 },
    { header: t(`${wb}colIssue`), key: "issue", width: 30 }
  ];
  styleHeaderRow(exceptionsSheet.getRow(1));
  const studentById = new Map(students.map((s) => [s.studentId, s]));
  let exceptionCount = 0;
  for (const slot of sortedSubjects) {
    if (!slot.scheduleItemId) {
      exceptionsSheet.addRow({ subject: slot.subjectName, student: dash, rollNo: dash, issue: t(`${wb}noLinkedScheduleItem`) });
      exceptionCount += 1;
      continue;
    }
    const rows = results.filter((r) => r.scheduleItemId === slot.scheduleItemId);
    if (rows.length === 0) {
      exceptionsSheet.addRow({ subject: slot.subjectName, student: dash, rollNo: dash, issue: t(`${wb}noResultsRecorded`) });
      exceptionCount += 1;
      continue;
    }
    for (const r of rows) {
      if (r.isAbsent) {
        const student = studentById.get(r.studentId);
        exceptionsSheet.addRow({
          subject: slot.subjectName,
          student: student?.name ?? t(`${wb}unknownStudent`),
          rollNo: student?.rollNo ?? dash,
          issue: t(`${wb}absent`)
        });
        exceptionCount += 1;
      }
    }
  }
  if (exceptionCount === 0) {
    exceptionsSheet.addRow({ subject: dash, student: dash, rollNo: dash, issue: t(`${wb}noExceptionsAllComplete`) });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
