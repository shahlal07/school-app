import ExcelJS from "exceljs";
import type {
  ExamSetReport,
  ExamSetSubjectSlot,
  ResultInput,
  StudentInput
} from "@/lib/examination/exam-set-analytics";

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
  results: ResultInput[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.schoolName;
  workbook.created = meta.generatedAt;
  const printTitle = `${meta.schoolName} — ${meta.className} — Exam Set #${meta.setNumber}`;

  // ---- Sheet 1: Executive Summary ----
  const summary = workbook.addWorksheet("Executive Summary", { views: [{ showGridLines: false }] });
  applyLandscapePrint(summary, printTitle);
  summary.columns = [{ width: 28 }, { width: 40 }];
  const summaryRows: [string, string][] = [
    ["School", meta.schoolName],
    ["Exam Set", `#${meta.setNumber}`],
    ["Class", meta.className],
    ["Assessment stage", meta.assessmentScope.replace(/_/g, " ")],
    ["Period", `${meta.startedOn ?? "—"} to ${meta.completedOn ?? "—"}`],
    ["Subjects completed", `${subjects.length}`],
    ["Students", `${report.totalStudents}`],
    ["Overall average", pct(report.overallAverage)],
    ["Overall pass rate", pct(report.overallPassRate)],
    [
      "Top performer",
      report.rankings[0]
        ? `${report.rankings[0].name} (#${report.rankings[0].rollNo}) — ${report.rankings[0].percentage}%`
        : "—"
    ],
    [
      "Weakest subject",
      report.weakestSubject ? `${report.weakestSubject.subjectName} — ${pct(report.weakestSubject.average)}` : "—"
    ],
    [
      "Strongest subject",
      report.strongestSubject ? `${report.strongestSubject.subjectName} — ${pct(report.strongestSubject.average)}` : "—"
    ],
    ["Students requiring attention", `${report.studentsRequiringAttention.length}`],
    ["Generated", meta.generatedAt.toISOString().slice(0, 19).replace("T", " ")],
    ["Finalized by", meta.finalizedByName ?? "—"]
  ];
  for (const [label, value] of summaryRows) {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }
  summary.addRow([]);
  summary.addRow(["Sign-off:", "________________________"]);

  // ---- Sheet 2: Student Rankings (full roster, per-subject matrix) ----
  const rankSheet = workbook.addWorksheet("Student Rankings", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(rankSheet, printTitle);
  const sortedSubjects = [...subjects].sort((a, b) => a.sequence - b.sequence);
  const rankHeader = [
    "Rank",
    "Roll No",
    "Student",
    ...sortedSubjects.map((s) => s.subjectName),
    "Total",
    "Percentage",
    "Status"
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
      if (!slot.scheduleItemId) return "—";
      const r = resultsByScheduleAndStudent.get(`${slot.scheduleItemId}:${ranking.studentId}`);
      if (!r) return "—";
      if (r.isAbsent) return "Absent";
      return r.marksObtained ?? "—";
    });
    const row = rankSheet.addRow([
      index + 1,
      ranking.rollNo,
      ranking.name,
      ...subjectCells,
      `${ranking.totalObtained}/${ranking.totalPossible}`,
      `${ranking.percentage}%`,
      ranking.subjectFailures > 0 ? `${ranking.subjectFailures} failed` : "Pass"
    ]);
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7F5" } };
      });
    }
  });

  // ---- Sheet 3: Subject Analysis ----
  const subjectSheet = workbook.addWorksheet("Subject Analysis", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(subjectSheet, printTitle);
  subjectSheet.columns = [
    { header: "Subject", key: "subject", width: 22 },
    { header: "Teacher", key: "teacher", width: 20 },
    { header: "Average", key: "average", width: 12 },
    { header: "Pass Rate", key: "passRate", width: 12 },
    { header: "Highest", key: "highest", width: 12 },
    { header: "Lowest", key: "lowest", width: 12 },
    { header: "Failures", key: "failures", width: 10 },
    { header: "Graded", key: "graded", width: 10 },
    { header: "Change vs Previous Set", key: "change", width: 20 }
  ];
  styleHeaderRow(subjectSheet.getRow(1));
  for (const s of report.subjects) {
    subjectSheet.addRow({
      subject: s.subjectName,
      teacher: s.teacherName ?? "Unassigned",
      average: pct(s.average),
      passRate: pct(s.passRate),
      highest: pct(s.highest),
      lowest: pct(s.lowest),
      failures: s.failureCount,
      graded: `${s.gradedCount}/${s.totalStudents}`,
      change: s.changeVsPreviousSet === null ? "First set" : `${s.changeVsPreviousSet > 0 ? "+" : ""}${s.changeVsPreviousSet} pp`
    });
  }

  // ---- Sheet 4: Teacher Performance ----
  const teacherSheet = workbook.addWorksheet("Teacher Performance", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(teacherSheet, printTitle);
  teacherSheet.columns = [
    { header: "Teacher", key: "teacher", width: 22 },
    { header: "Class", key: "klass", width: 14 },
    { header: "Subject", key: "subject", width: 20 },
    { header: "Students", key: "students", width: 12 },
    { header: "Average", key: "average", width: 12 },
    { header: "Pass Rate", key: "passRate", width: 12 },
    { header: "Change vs Previous Set", key: "change", width: 20 }
  ];
  styleHeaderRow(teacherSheet.getRow(1));
  for (const s of report.subjects) {
    teacherSheet.addRow({
      teacher: s.teacherName ?? "Unassigned",
      klass: meta.className,
      subject: s.subjectName,
      students: s.totalStudents,
      average: pct(s.average),
      passRate: pct(s.passRate),
      change: s.changeVsPreviousSet === null ? "First set" : `${s.changeVsPreviousSet > 0 ? "+" : ""}${s.changeVsPreviousSet} pp`
    });
  }

  // ---- Sheet 5: At-Risk Students ----
  const riskSheet = workbook.addWorksheet("At-Risk Students", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(riskSheet, printTitle);
  riskSheet.columns = [
    { header: "Roll No", key: "rollNo", width: 14 },
    { header: "Student", key: "name", width: 24 },
    { header: "Percentage", key: "percentage", width: 14 },
    { header: "Subject Failures", key: "failures", width: 16 },
    { header: "Reason", key: "reason", width: 46 }
  ];
  styleHeaderRow(riskSheet.getRow(1));
  if (report.studentsRequiringAttention.length === 0) {
    riskSheet.addRow(["—", "No students flagged this set", "—", "—", "—"]);
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
  const topSheet = workbook.addWorksheet("Top Performers", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(topSheet, printTitle);
  topSheet.columns = [
    { header: "Rank", key: "rank", width: 10 },
    { header: "Roll No", key: "rollNo", width: 14 },
    { header: "Student", key: "name", width: 24 },
    { header: "Total", key: "total", width: 16 },
    { header: "Percentage", key: "percentage", width: 14 }
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
  const exceptionsSheet = workbook.addWorksheet("Exceptions", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  applyLandscapePrint(exceptionsSheet, printTitle);
  exceptionsSheet.columns = [
    { header: "Subject", key: "subject", width: 22 },
    { header: "Student", key: "student", width: 24 },
    { header: "Roll No", key: "rollNo", width: 14 },
    { header: "Issue", key: "issue", width: 30 }
  ];
  styleHeaderRow(exceptionsSheet.getRow(1));
  const studentById = new Map(students.map((s) => [s.studentId, s]));
  let exceptionCount = 0;
  for (const slot of sortedSubjects) {
    if (!slot.scheduleItemId) {
      exceptionsSheet.addRow({ subject: slot.subjectName, student: "—", rollNo: "—", issue: "No linked schedule item" });
      exceptionCount += 1;
      continue;
    }
    const rows = results.filter((r) => r.scheduleItemId === slot.scheduleItemId);
    if (rows.length === 0) {
      exceptionsSheet.addRow({ subject: slot.subjectName, student: "—", rollNo: "—", issue: "No results recorded" });
      exceptionCount += 1;
      continue;
    }
    for (const r of rows) {
      if (r.isAbsent) {
        const student = studentById.get(r.studentId);
        exceptionsSheet.addRow({
          subject: slot.subjectName,
          student: student?.name ?? "Unknown",
          rollNo: student?.rollNo ?? "—",
          issue: "Absent"
        });
        exceptionCount += 1;
      }
    }
  }
  if (exceptionCount === 0) {
    exceptionsSheet.addRow({ subject: "—", student: "—", rollNo: "—", issue: "No exceptions - all records complete" });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
