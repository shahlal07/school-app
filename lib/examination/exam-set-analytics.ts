/**
 * Pure aggregation logic for an exam set's performance report (Phase D of
 * the continuous exam-set model) - no I/O, no Supabase calls, independently
 * testable, mirroring lib/scheduling/generate-schedule.ts's separation of
 * concerns. Callers fetch the raw rows (exam_set_subjects, test_results,
 * students, subjects, teacher assignments) and pass them in here.
 */

export interface ExamSetSubjectSlot {
  subjectId: string;
  subjectName: string;
  sequence: number;
  scheduledDate: string | null;
  scheduleItemId: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

export interface StudentInput {
  studentId: string;
  name: string;
  rollNo: string;
}

export interface ResultInput {
  scheduleItemId: string;
  studentId: string;
  marksObtained: number | null;
  totalMarks: number;
  isAbsent: boolean;
  isPass: boolean | null;
}

export interface SubjectAnalysis {
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  average: number | null;
  passRate: number | null;
  highest: number | null;
  lowest: number | null;
  failureCount: number;
  gradedCount: number;
  totalStudents: number;
  changeVsPreviousSet: number | null;
}

export interface StudentRanking {
  studentId: string;
  rollNo: string;
  name: string;
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  subjectFailures: number;
  subjectsAbsent: number;
}

export interface PerformanceBands {
  "90-100": number;
  "80-89": number;
  "70-79": number;
  "60-69": number;
  "50-59": number;
  "below-50": number;
}

export interface StudentAttention {
  studentId: string;
  rollNo: string;
  name: string;
  percentage: number;
  subjectFailures: number;
  reason: string;
}

export interface ExamSetReport {
  totalStudents: number;
  overallAverage: number | null;
  overallPassRate: number | null;
  subjects: SubjectAnalysis[];
  weakestSubject: SubjectAnalysis | null;
  strongestSubject: SubjectAnalysis | null;
  rankings: StudentRanking[];
  performanceBands: PerformanceBands;
  studentsRequiringAttention: StudentAttention[];
}

const ATTENTION_PERCENTAGE_THRESHOLD = 40;
const ATTENTION_MIN_SUBJECT_FAILURES = 2;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Computes a full exam-set report from raw rows. `previousSetSubjectAverages`
 * (subjectId -> average %) is optional - when provided, each subject's
 * change vs the previous set is included; when absent (no prior completed
 * set exists for the class), changeVsPreviousSet is null throughout, which
 * callers must render as an honest "not enough data" state, not a fabricated
 * zero.
 */
export function computeExamSetReport(
  subjects: ExamSetSubjectSlot[],
  students: StudentInput[],
  results: ResultInput[],
  previousSetSubjectAverages?: Record<string, number>
): ExamSetReport {
  const resultsBySchedule = new Map<string, ResultInput[]>();
  for (const r of results) {
    const list = resultsBySchedule.get(r.scheduleItemId) ?? [];
    list.push(r);
    resultsBySchedule.set(r.scheduleItemId, list);
  }

  const subjectAnalyses: SubjectAnalysis[] = subjects.map((slot) => {
    const rows = slot.scheduleItemId ? resultsBySchedule.get(slot.scheduleItemId) ?? [] : [];
    const graded = rows.filter((r) => !r.isAbsent && r.marksObtained !== null);
    const percentages = graded.map((r) => (r.marksObtained! / r.totalMarks) * 100);
    const passed = rows.filter((r) => r.isPass === true).length;
    const failed = rows.filter((r) => r.isPass === false).length;
    const avg = average(percentages);
    const prevAvg = previousSetSubjectAverages?.[slot.subjectId];

    return {
      subjectId: slot.subjectId,
      subjectName: slot.subjectName,
      teacherName: slot.teacherName,
      average: avg !== null ? round1(avg) : null,
      passRate: passed + failed > 0 ? round1((passed / (passed + failed)) * 100) : null,
      highest: percentages.length > 0 ? round1(Math.max(...percentages)) : null,
      lowest: percentages.length > 0 ? round1(Math.min(...percentages)) : null,
      failureCount: failed,
      gradedCount: graded.length,
      totalStudents: rows.length,
      changeVsPreviousSet:
        avg !== null && prevAvg !== undefined ? round1(avg - prevAvg) : null
    };
  });

  const subjectsWithAverage = subjectAnalyses.filter((s) => s.average !== null);
  const weakestSubject =
    subjectsWithAverage.length > 0
      ? subjectsWithAverage.reduce((a, b) => (b.average! < a.average! ? b : a))
      : null;
  const strongestSubject =
    subjectsWithAverage.length > 0
      ? subjectsWithAverage.reduce((a, b) => (b.average! > a.average! ? b : a))
      : null;

  const overallAverage = average(subjectsWithAverage.map((s) => s.average!));
  const passRatesWithData = subjectAnalyses.filter((s) => s.passRate !== null);
  const overallPassRate = average(passRatesWithData.map((s) => s.passRate!));

  const rankings: StudentRanking[] = students
    .map((student) => {
      let totalObtained = 0;
      let totalPossible = 0;
      let subjectFailures = 0;
      let subjectsAbsent = 0;

      for (const slot of subjects) {
        const rows = slot.scheduleItemId ? resultsBySchedule.get(slot.scheduleItemId) ?? [] : [];
        const row = rows.find((r) => r.studentId === student.studentId);
        if (!row) continue;
        totalPossible += row.totalMarks;
        if (row.isAbsent) {
          subjectsAbsent += 1;
          continue;
        }
        totalObtained += row.marksObtained ?? 0;
        if (row.isPass === false) subjectFailures += 1;
      }

      return {
        studentId: student.studentId,
        rollNo: student.rollNo,
        name: student.name,
        totalObtained,
        totalPossible,
        percentage: totalPossible > 0 ? round1((totalObtained / totalPossible) * 100) : 0,
        subjectFailures,
        subjectsAbsent
      };
    })
    .filter((r) => r.totalPossible > 0)
    .sort((a, b) => b.percentage - a.percentage);

  const performanceBands: PerformanceBands = {
    "90-100": 0,
    "80-89": 0,
    "70-79": 0,
    "60-69": 0,
    "50-59": 0,
    "below-50": 0
  };
  for (const r of rankings) {
    if (r.percentage >= 90) performanceBands["90-100"] += 1;
    else if (r.percentage >= 80) performanceBands["80-89"] += 1;
    else if (r.percentage >= 70) performanceBands["70-79"] += 1;
    else if (r.percentage >= 60) performanceBands["60-69"] += 1;
    else if (r.percentage >= 50) performanceBands["50-59"] += 1;
    else performanceBands["below-50"] += 1;
  }

  const studentsRequiringAttention: StudentAttention[] = rankings
    .filter(
      (r) =>
        r.percentage < ATTENTION_PERCENTAGE_THRESHOLD ||
        r.subjectFailures >= ATTENTION_MIN_SUBJECT_FAILURES
    )
    .map((r) => ({
      studentId: r.studentId,
      rollNo: r.rollNo,
      name: r.name,
      percentage: r.percentage,
      subjectFailures: r.subjectFailures,
      reason:
        r.percentage < ATTENTION_PERCENTAGE_THRESHOLD
          ? `Overall ${r.percentage}%, below the ${ATTENTION_PERCENTAGE_THRESHOLD}% attention threshold`
          : `Failed ${r.subjectFailures} subjects this set`
    }));

  return {
    totalStudents: students.length,
    overallAverage: overallAverage !== null ? round1(overallAverage) : null,
    overallPassRate: overallPassRate !== null ? round1(overallPassRate) : null,
    subjects: subjectAnalyses,
    weakestSubject,
    strongestSubject,
    rankings,
    performanceBands,
    studentsRequiringAttention
  };
}
