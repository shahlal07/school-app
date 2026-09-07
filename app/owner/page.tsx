import Link from "next/link";

import type { Student } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";
import { getAttendanceAcademicSignals } from "@/lib/attendance/integration";
import {
  computeExamSetReport,
  type ExamSetSubjectSlot,
  type ResultInput,
  type StudentInput
} from "@/lib/examination/exam-set-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import {
  ScoreRing,
  TrendChart,
  RiskDonut,
  StatTile,
  MiniStat,
  deltaText,
  type TrendPoint
} from "@/components/shared/dashboard-charts";

interface NameRow {
  id: string;
  name: string;
}

type ExamSetStatus = "planned" | "active" | "awaiting_completion" | "completed" | "cancelled";

interface ExamSetRow {
  id: string;
  class_id: string;
  set_number: number;
  status: ExamSetStatus;
  completed_on: string | null;
}

interface ExamSetSubjectRow {
  id: string;
  exam_set_id: string;
  subject_id: string;
  sequence: number;
  scheduled_date: string | null;
  schedule_item_id: string | null;
}

interface ScheduleItemStatusRow {
  id: string;
  status: string;
}

interface TestResultRow {
  schedule_item_id: string;
  student_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_absent: boolean;
  is_pass: boolean | null;
}

interface ExamCycleCard {
  examSetId: string;
  className: string;
  setNumber: number;
  doneSlots: number;
  totalSlots: number;
  nextSubjectLabel: string;
  overallAverage: number | null;
  examAttendancePct: number | null;
  resultCompletionPct: number | null;
}

interface ExceptionGroup {
  severity: "critical" | "high" | "medium" | "operational";
  count: number;
  sample: string;
}

const IN_PROGRESS_EXAM_SET_STATUSES: ExamSetStatus[] = ["planned", "active", "awaiting_completion"];

const EXCEPTION_SEVERITY_STYLE: Record<
  ExceptionGroup["severity"],
  { dot: string; text: string; badge: "danger" | "warning" | "info" | "neutral" }
> = {
  critical: { dot: "bg-danger-600", text: "text-danger-700", badge: "danger" },
  high: { dot: "bg-warning-600", text: "text-warning-700", badge: "warning" },
  medium: { dot: "bg-amber-400", text: "text-amber-700", badge: "warning" },
  operational: { dot: "bg-primary-500", text: "text-primary-700", badge: "info" }
};

// DangerRow.severity ("warning"|"high"|"urgent"|"critical") mapped onto the
// 4-tier exception taxonomy this card displays. "urgent" reads as this
// school's most operationally pressing tier short of "critical", so it's
// grouped under "high"; the model's own "high" (structural risk, not yet
// urgent) reads as "medium" here; "warning" (compliance/process gaps, not
// academic risk) is "operational".
const DANGER_SEVERITY_TO_EXCEPTION: Record<string, ExceptionGroup["severity"]> = {
  critical: "critical",
  urgent: "high",
  high: "medium",
  warning: "operational"
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function healthStatusKey(score: number): { key: "healthy" | "watch" | "critical"; className: string } {
  if (score >= 80) return { key: "healthy", className: "text-success-600" };
  if (score >= 60) return { key: "watch", className: "text-warning-600" };
  return { key: "critical", className: "text-danger-600" };
}

function trendLabel(delta: number | null): { label: "improving" | "declining" | "steady"; className: string } {
  if (delta === null || Math.abs(delta) < 0.5) return { label: "steady", className: "bg-neutral-100 text-neutral-600" };
  return delta > 0
    ? { label: "improving", className: "bg-success-100 text-success-700" }
    : { label: "declining", className: "bg-danger-100 text-danger-700" };
}

export default async function OwnerHomePage() {
  const supabase = createClient();
  const t = await getT();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const [
    classNamesRes,
    subjectNamesRes,
    inProgressExamSetsRes,
    completedExamSetsRes,
    allTestResultsRes,
    dailyAttendance,
    riskSignals,
    intelligence,
    previousSnapshotRes
  ] = await Promise.all([
    supabase.from("classes").select("id, name"),
    supabase.from("subjects").select("id, name"),
    supabase
      .from("exam_sets")
      .select("id, class_id, set_number, status, completed_on")
      .in("status", IN_PROGRESS_EXAM_SET_STATUSES),
    supabase
      .from("exam_sets")
      .select("id, class_id, set_number, status, completed_on")
      .eq("status", "completed")
      .order("completed_on", { ascending: false })
      .limit(4),
    supabase.from("test_results").select("marks_obtained, total_marks, is_absent, is_pass"),
    getDailyAttendanceReport(todayIso),
    getAttendanceAcademicSignals(50),
    getAcademicIntelligenceData(),
    supabase
      .from("academic_health_snapshots")
      .select("*")
      .lt("snapshot_date", todayIso)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const classNameById = new Map(((classNamesRes.data as NameRow[] | null) ?? []).map((c) => [c.id, c.name]));
  const subjectNameById = new Map(((subjectNamesRes.data as NameRow[] | null) ?? []).map((s) => [s.id, s.name]));

  // ---- School-wide overall average / pass rate (all graded results ever) ----
  const allResultsRaw = (allTestResultsRes.data as { marks_obtained: number | null; total_marks: number; is_absent: boolean; is_pass: boolean | null }[] | null) ?? [];
  const gradedResults = allResultsRaw.filter((r) => !r.is_absent && r.marks_obtained !== null && r.total_marks > 0);
  const overallAverage = gradedResults.length
    ? Math.round((gradedResults.reduce((sum, r) => sum + (Number(r.marks_obtained) / r.total_marks) * 100, 0) / gradedResults.length) * 10) / 10
    : null;
  const overallPassRate = gradedResults.length
    ? Math.round((gradedResults.filter((r) => r.is_pass === true).length / gradedResults.length) * 1000) / 10
    : null;

  // ---- Today's school-wide attendance % ----
  const attendanceRows = dailyAttendance.rows;
  const attendanceTotals = attendanceRows.reduce(
    (acc, row) => ({ total: acc.total + row.total_students, present: acc.present + row.present_count }),
    { total: 0, present: 0 }
  );
  const attendancePct = attendanceTotals.total > 0 ? Math.round((attendanceTotals.present / attendanceTotals.total) * 1000) / 10 : null;

  // ---- Health metrics (fixed order from getAcademicIntelligenceData) ----
  const [examReadinessMetric, teacherComplianceMetric, resultCompletionMetric, , syllabusProgressMetric] = intelligence.healthMetrics;
  const studentsNeedingAttentionCount = intelligence.studentRisks.length;

  // ---- Risk breakdown (real attendance_academic_signal view) ----
  const riskByClass = new Map<string, number>();
  let academicCount = 0;
  let attendanceCount = 0;
  let bothCount = 0;
  for (const row of riskSignals.rows) {
    if (row.signal === "academic_despite_attendance") academicCount += 1;
    else if (row.signal === "attendance_primary") attendanceCount += 1;
    else if (row.signal === "attendance_and_academic") bothCount += 1;
    riskByClass.set(row.class_id, (riskByClass.get(row.class_id) ?? 0) + 1);
  }
  let highestRiskClassId: string | null = null;
  let highestRiskCount = 0;
  riskByClass.forEach((count, classId) => {
    if (count > highestRiskCount) {
      highestRiskCount = count;
      highestRiskClassId = classId;
    }
  });

  // ---- Key exceptions: real dangers, grouped by the 4-tier taxonomy ----
  const exceptionBuckets = new Map<ExceptionGroup["severity"], { count: number; labels: Map<string, number> }>();
  for (const danger of intelligence.dangers) {
    const bucket = DANGER_SEVERITY_TO_EXCEPTION[danger.severity] ?? "operational";
    const entry = exceptionBuckets.get(bucket) ?? { count: 0, labels: new Map<string, number>() };
    entry.count += 1;
    entry.labels.set(danger.label, (entry.labels.get(danger.label) ?? 0) + 1);
    exceptionBuckets.set(bucket, entry);
  }
  const exceptionOrder: ExceptionGroup["severity"][] = ["critical", "high", "medium", "operational"];
  const exceptionGroups: ExceptionGroup[] = exceptionOrder
    .filter((sev) => exceptionBuckets.has(sev))
    .map((sev) => {
      const entry = exceptionBuckets.get(sev)!;
      const topLabel = Array.from(entry.labels.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      return { severity: sev, count: entry.count, sample: topLabel };
    });

  // ---- Current exam cycle (in-progress sets) ----
  const inProgressExamSets = (inProgressExamSetsRes.data as ExamSetRow[] | null) ?? [];
  let examCycleCards: ExamCycleCard[] = [];

  if (inProgressExamSets.length > 0) {
    const examSetIds = inProgressExamSets.map((s) => s.id);
    const inProgressClassIds = Array.from(new Set(inProgressExamSets.map((s) => s.class_id)));

    const [examSetSubjectsRes, studentsForCycleRes] = await Promise.all([
      supabase
        .from("exam_set_subjects")
        .select("id, exam_set_id, subject_id, sequence, scheduled_date, schedule_item_id")
        .in("exam_set_id", examSetIds)
        .order("sequence", { ascending: true }),
      supabase
        .from("students")
        .select("id, class_id, section_id, roll_no, name, is_active")
        .in("class_id", inProgressClassIds)
        .eq("is_active", true)
    ]);

    const examSetSubjects = (examSetSubjectsRes.data as ExamSetSubjectRow[] | null) ?? [];
    const scheduleItemIds = examSetSubjects.map((row) => row.schedule_item_id).filter((id): id is string => Boolean(id));

    const [scheduleItemsRes, resultsRes] = await Promise.all([
      scheduleItemIds.length > 0
        ? supabase.from("schedule_items").select("id, status").in("id", scheduleItemIds)
        : Promise.resolve({ data: [] as ScheduleItemStatusRow[] }),
      scheduleItemIds.length > 0
        ? supabase
            .from("test_results")
            .select("schedule_item_id, student_id, marks_obtained, total_marks, is_absent, is_pass")
            .in("schedule_item_id", scheduleItemIds)
        : Promise.resolve({ data: [] as TestResultRow[] })
    ]);

    const scheduleItemStatusById = new Map(((scheduleItemsRes.data as ScheduleItemStatusRow[] | null) ?? []).map((si) => [si.id, si.status]));
    const allResults = (resultsRes.data as TestResultRow[] | null) ?? [];
    const resultsByScheduleItem = new Map<string, TestResultRow[]>();
    for (const r of allResults) {
      const list = resultsByScheduleItem.get(r.schedule_item_id) ?? [];
      list.push(r);
      resultsByScheduleItem.set(r.schedule_item_id, list);
    }

    const students = (studentsForCycleRes.data as Student[] | null) ?? [];
    const studentsByClassId = new Map<string, StudentInput[]>();
    for (const s of students) {
      const list = studentsByClassId.get(s.class_id) ?? [];
      list.push({ studentId: s.id, name: s.name, rollNo: s.roll_no });
      studentsByClassId.set(s.class_id, list);
    }

    const subjectRowsByExamSet = new Map<string, ExamSetSubjectRow[]>();
    for (const row of examSetSubjects) {
      const list = subjectRowsByExamSet.get(row.exam_set_id) ?? [];
      list.push(row);
      subjectRowsByExamSet.set(row.exam_set_id, list);
    }

    const isSlotDone = (row: ExamSetSubjectRow): boolean => {
      const passedByDate = row.scheduled_date !== null && row.scheduled_date <= todayIso;
      const itemStatus = row.schedule_item_id ? scheduleItemStatusById.get(row.schedule_item_id) : null;
      return passedByDate || itemStatus === "completed";
    };

    examCycleCards = inProgressExamSets
      .map((set) => {
        const rows = (subjectRowsByExamSet.get(set.id) ?? []).slice().sort((a, b) => a.sequence - b.sequence);
        const totalSlots = rows.length;
        const doneSlots = rows.filter(isSlotDone).length;
        const nextRow = rows.find((row) => !isSlotDone(row));
        const nextSubjectLabel = nextRow
          ? subjectNameById.get(nextRow.subject_id) ?? t("owner.papers.unknownSubject")
          : totalSlots > 0
            ? t("owner.dashboard.allSubjectsConducted")
            : t("owner.dashboard.noSubjectsScheduledYet");

        const subjectSlots: ExamSetSubjectSlot[] = rows.map((row) => ({
          subjectId: row.subject_id,
          subjectName: subjectNameById.get(row.subject_id) ?? t("owner.papers.unknownSubject"),
          sequence: row.sequence,
          scheduledDate: row.scheduled_date,
          scheduleItemId: row.schedule_item_id,
          teacherId: null,
          teacherName: null
        }));
        const cycleResultRows = rows.flatMap((row) => (row.schedule_item_id ? resultsByScheduleItem.get(row.schedule_item_id) ?? [] : []));
        const resultInputs: ResultInput[] = cycleResultRows.map((r) => ({
          scheduleItemId: r.schedule_item_id,
          studentId: r.student_id,
          marksObtained: r.marks_obtained,
          totalMarks: r.total_marks,
          isAbsent: r.is_absent,
          isPass: r.is_pass
        }));
        const studentInputs = studentsByClassId.get(set.class_id) ?? [];
        const report = computeExamSetReport(subjectSlots, studentInputs, resultInputs);

        const gradedRows = cycleResultRows.filter((r) => !r.is_absent && r.marks_obtained !== null);
        const expectedTotal = studentInputs.length * totalSlots;
        const resultCompletionPct = expectedTotal > 0 ? Math.round((cycleResultRows.length / expectedTotal) * 1000) / 10 : null;
        const examAttendancePct = cycleResultRows.length > 0 ? Math.round((gradedRows.length / cycleResultRows.length) * 1000) / 10 : null;

        return {
          examSetId: set.id,
          className: classNameById.get(set.class_id) ?? t("owner.papers.unknownClass"),
          setNumber: set.set_number,
          doneSlots,
          totalSlots,
          nextSubjectLabel,
          overallAverage: report.overallAverage,
          examAttendancePct,
          resultCompletionPct
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }
  const primaryExamCycle = examCycleCards[0] ?? null;

  // ---- Academic performance trend: last 4 completed exam sets, school-wide ----
  const completedExamSets = ((completedExamSetsRes.data as ExamSetRow[] | null) ?? []).slice().reverse();
  let trendPoints: TrendPoint[] = [];
  if (completedExamSets.length > 0) {
    const completedIds = completedExamSets.map((s) => s.id);
    const { data: completedSubjectsData } = await supabase
      .from("exam_set_subjects")
      .select("exam_set_id, schedule_item_id")
      .in("exam_set_id", completedIds);
    const completedSubjects = (completedSubjectsData as { exam_set_id: string; schedule_item_id: string | null }[] | null) ?? [];
    const scheduleItemIdsBySet = new Map<string, string[]>();
    const allScheduleItemIds: string[] = [];
    for (const row of completedSubjects) {
      if (!row.schedule_item_id) continue;
      const list = scheduleItemIdsBySet.get(row.exam_set_id) ?? [];
      list.push(row.schedule_item_id);
      scheduleItemIdsBySet.set(row.exam_set_id, list);
      allScheduleItemIds.push(row.schedule_item_id);
    }
    const { data: trendResultsData } = allScheduleItemIds.length
      ? await supabase.from("test_results").select("schedule_item_id, marks_obtained, total_marks, is_absent, is_pass").in("schedule_item_id", allScheduleItemIds)
      : { data: [] as TestResultRow[] };
    const trendResults = (trendResultsData as TestResultRow[] | null) ?? [];
    const resultsByItem = new Map<string, TestResultRow[]>();
    for (const r of trendResults) {
      const list = resultsByItem.get(r.schedule_item_id) ?? [];
      list.push(r);
      resultsByItem.set(r.schedule_item_id, list);
    }

    trendPoints = completedExamSets.map((set) => {
      const itemIds = scheduleItemIdsBySet.get(set.id) ?? [];
      const rows = itemIds.flatMap((id) => resultsByItem.get(id) ?? []);
      const graded = rows.filter((r) => !r.is_absent && r.marks_obtained !== null && r.total_marks > 0);
      const average = graded.length
        ? Math.round((graded.reduce((sum, r) => sum + (Number(r.marks_obtained) / r.total_marks) * 100, 0) / graded.length) * 10) / 10
        : null;
      const passRate = graded.length ? Math.round((graded.filter((r) => r.is_pass === true).length / graded.length) * 1000) / 10 : null;
      return {
        setLabel: `${classNameById.get(set.class_id) ?? "?"} #${set.set_number}`,
        average,
        passRate
      };
    });
  }
  const firstTrendPoint = trendPoints.find((p) => p.average !== null) ?? null;
  const lastTrendPoint = [...trendPoints].reverse().find((p) => p.average !== null) ?? null;
  const trendAverageDelta = firstTrendPoint && lastTrendPoint && firstTrendPoint !== lastTrendPoint ? (lastTrendPoint.average as number) - (firstTrendPoint.average as number) : null;
  const firstTrendPassPoint = trendPoints.find((p) => p.passRate !== null) ?? null;
  const lastTrendPassPoint = [...trendPoints].reverse().find((p) => p.passRate !== null) ?? null;
  const trendPassDelta = firstTrendPassPoint && lastTrendPassPoint && firstTrendPassPoint !== lastTrendPassPoint ? (lastTrendPassPoint.passRate as number) - (firstTrendPassPoint.passRate as number) : null;

  // ---- Recent activity: real timestamped events ----
  const [{ data: recentFinalizedRaw }, { data: recentResolvedRaw }] = await Promise.all([
    supabase.from("exam_sets").select("id, class_id, set_number, completed_on").eq("status", "completed").order("completed_on", { ascending: false }).limit(2),
    supabase.from("alerts").select("id, message, resolved_at").eq("status", "resolved").order("resolved_at", { ascending: false }).limit(2)
  ]);
  type ActivityItem = { id: string; text: string; meta: string; at: string };
  const activity: ActivityItem[] = [
    ...(((recentFinalizedRaw as { id: string; class_id: string; set_number: number; completed_on: string | null }[] | null) ?? [])
      .filter((row) => row.completed_on)
      .map((row) => ({
        id: `set-${row.id}`,
        text: `Set #${row.set_number} finalized`,
        meta: `${classNameById.get(row.class_id) ?? "?"} · ${formatDate((row.completed_on as string).slice(0, 10))}`,
        at: row.completed_on as string
      }))),
    ...(((recentResolvedRaw as { id: string; message: string; resolved_at: string | null }[] | null) ?? [])
      .filter((row) => row.resolved_at)
      .map((row) => ({
        id: `alert-${row.id}`,
        text: "Alert resolved",
        meta: row.message,
        at: row.resolved_at as string
      })))
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  // ---- Deltas vs the most recent prior daily snapshot ----
  const previous = previousSnapshotRes.data as {
    health_score: number;
    exam_readiness_score: number;
    teacher_compliance_score: number;
    syllabus_progress_score: number;
    students_at_risk_count: number;
    attendance_pct: number | null;
    overall_average: number | null;
    pass_rate: number | null;
  } | null;

  const healthScoreDelta = previous ? intelligence.healthScore - previous.health_score : null;
  const studentsAtRiskDelta = previous ? studentsNeedingAttentionCount - previous.students_at_risk_count : null;
  const attendanceDelta = previous && previous.attendance_pct !== null && attendancePct !== null ? attendancePct - previous.attendance_pct : null;
  const examReadinessDelta = previous && examReadinessMetric ? examReadinessMetric.score - previous.exam_readiness_score : null;
  const teacherComplianceDelta = previous && teacherComplianceMetric ? teacherComplianceMetric.score - previous.teacher_compliance_score : null;
  const overallAverageDelta = previous && previous.overall_average !== null && overallAverage !== null ? overallAverage - previous.overall_average : null;
  const passRateDelta = previous && previous.pass_rate !== null && overallPassRate !== null ? overallPassRate - previous.pass_rate : null;
  const syllabusDelta = previous && syllabusProgressMetric ? syllabusProgressMetric.score - previous.syllabus_progress_score : null;

  // Record today's snapshot so tomorrow's page load has a real baseline to
  // compare against - upsert keyed on snapshot_date, safe to call on every
  // page view.
  await supabase.from("academic_health_snapshots").upsert(
    {
      snapshot_date: todayIso,
      health_score: intelligence.healthScore,
      exam_readiness_score: examReadinessMetric?.score ?? 0,
      teacher_compliance_score: teacherComplianceMetric?.score ?? 0,
      syllabus_progress_score: syllabusProgressMetric?.score ?? 0,
      result_completion_score: resultCompletionMetric?.score ?? 0,
      student_performance_score: 0,
      students_at_risk_count: studentsNeedingAttentionCount,
      attendance_pct: attendancePct,
      overall_average: overallAverage,
      pass_rate: overallPassRate
    },
    { onConflict: "snapshot_date" }
  );

  const healthStatus = healthStatusKey(intelligence.healthScore);
  const healthTrend = trendLabel(healthScoreDelta);
  const academicYear = `${now.getUTCFullYear()}–${String(now.getUTCFullYear() + 1).slice(2)}`;
  const dayName = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const hour = now.getUTCHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-800 to-primary-700 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{greetingWord}, {t("nav.dashboard") === "Dashboard" ? "Owner" : t("nav.dashboard")}</h1>
            <p className="mt-1 text-sm text-primary-100">{t("ownerDashboard.subtitle")}</p>
          </div>
          <div className="text-right text-xs text-primary-100">
            <p><Bdi>{dayName}</Bdi></p>
            <p className="mt-0.5">Academic Year <Bdi>{academicYear}</Bdi></p>
          </div>
        </div>
      </div>

      {/* Academic Health */}
      <Card>
        <CardContent className="py-4">
          {intelligence.healthMetrics.length === 0 ? (
            <EmptyState title={t("intelligence.notEnoughDataForScore")} description={t("intelligence.notEnoughDataForScoreDescription")} />
          ) : (
            <>
              <Link href="/owner/academic-health" className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <ScoreRing value={intelligence.healthScore} color={healthStatus.key === "healthy" ? "#16a34a" : healthStatus.key === "watch" ? "#d97706" : "#dc2626"} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900">Academic Health</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${healthTrend.className}`}>
                        {healthTrend.label === "improving" ? "↑ " : healthTrend.label === "declining" ? "↓ " : ""}{healthTrend.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {deltaText(healthScoreDelta, "%").text} vs last set
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">Overall school performance is {healthTrend.label}.</p>
                  </div>
                </div>
                <span className="text-neutral-300">&rarr;</span>
              </Link>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label={t("intelligence.studentsNeedingAttention")} value={studentsNeedingAttentionCount} delta={deltaText(studentsAtRiskDelta, "")} deltaSuffix="vs last set" invert />
                <StatTile label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} delta={deltaText(attendanceDelta, "%")} deltaSuffix="vs last month" />
                <StatTile label={t("intelligence.examReadiness")} value={`${examReadinessMetric?.score ?? 0}%`} delta={deltaText(examReadinessDelta, "%")} deltaSuffix="vs last set" />
                <StatTile label={t("intelligence.teacherCompliance")} value={`${teacherComplianceMetric?.score ?? 0}%`} delta={deltaText(teacherComplianceDelta, "%")} deltaSuffix="vs last month" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Academic Performance Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Academic Performance Trend</CardTitle>
            <span className="text-xs text-neutral-400">Last {trendPoints.length || 4} sets</span>
          </div>
        </CardHeader>
        <CardContent>
          {trendPoints.length < 2 ? (
            <EmptyState title="Not enough completed exam sets yet" description="Once at least two exam sets are completed, the trend line will appear here." />
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <TrendChart points={trendPoints} />
                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-600" /> Average Percentage</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info-600" style={{ background: "#2563eb" }} /> Pass Rate</span>
                </div>
              </div>
              <div className="flex gap-3 lg:flex-col">
                <div className="flex-1 rounded-xl border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-500">Average Percentage</p>
                  <p className={`mt-1 text-lg font-semibold ${deltaText(trendAverageDelta, "%").positive === false ? "text-danger-600" : "text-success-600"}`}>{deltaText(trendAverageDelta, "%").text}</p>
                  <p className="text-[11px] text-neutral-400">vs {firstTrendPoint?.setLabel ?? "first set"}</p>
                </div>
                <div className="flex-1 rounded-xl border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-500">Pass Rate</p>
                  <p className={`mt-1 text-lg font-semibold ${deltaText(trendPassDelta, "%").positive === false ? "text-danger-600" : "text-success-600"}`}>{deltaText(trendPassDelta, "%").text}</p>
                  <p className="text-[11px] text-neutral-400">vs {firstTrendPassPoint?.setLabel ?? "first set"}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Exceptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Key Exceptions</CardTitle>
            <Link href="/owner/alerts" className="text-xs font-medium text-primary-600 hover:underline">View all &rarr;</Link>
          </div>
        </CardHeader>
        <CardContent>
          {exceptionGroups.length === 0 ? (
            <EmptyState title={t("intelligence.nothingUrgent")} description={t("intelligence.noOpenAlerts")} />
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {exceptionGroups.map((group) => {
                const style = EXCEPTION_SEVERITY_STYLE[group.severity];
                return (
                  <li key={group.severity} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>{group.severity}</p>
                        <p className="truncate text-sm text-neutral-700"><Bdi>{group.sample}</Bdi></p>
                      </div>
                    </div>
                    <Badge variant={style.badge}><Bdi>{group.count}</Bdi></Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* School Performance */}
        <Card>
          <CardHeader><CardTitle>School Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Overall Average" value={overallAverage === null ? "—" : `${overallAverage}%`} delta={deltaText(overallAverageDelta, "%")} />
              <MiniStat label="Pass Rate" value={overallPassRate === null ? "—" : `${overallPassRate}%`} delta={deltaText(passRateDelta, "%")} />
              <MiniStat label="Syllabus Coverage" value={`${syllabusProgressMetric?.score ?? 0}%`} delta={deltaText(syllabusDelta, "%")} />
            </div>
          </CardContent>
        </Card>

        {/* Exam Cycle Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Exam Cycle Progress</CardTitle>
              <Link href="/coordinator/exam-sets" className="text-xs font-medium text-primary-600 hover:underline">Details &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!primaryExamCycle ? (
              <EmptyState title={t("ownerDashboard.noExamCycle")} description={t("ownerDashboard.noExamCycleDescription")} />
            ) : (
              <div className="flex items-center gap-4">
                <ScoreRing
                  value={primaryExamCycle.totalSlots > 0 ? Math.round((primaryExamCycle.doneSlots / primaryExamCycle.totalSlots) * 100) : 0}
                  size={72}
                  stroke={7}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900"><Bdi>{primaryExamCycle.className}</Bdi> &middot; {t("owner.dashboard.setPrefix")} #<Bdi>{primaryExamCycle.setNumber}</Bdi></p>
                  <p className="text-xs text-neutral-500">{t("owner.dashboard.dayPrefix")} <Bdi>{primaryExamCycle.doneSlots}</Bdi> {t("owner.dashboard.ofWord")} <Bdi>{primaryExamCycle.totalSlots}</Bdi></p>
                  <p className="mt-1 text-xs text-neutral-500">Current Subject: <Bdi>{primaryExamCycle.nextSubjectLabel}</Bdi></p>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="text-neutral-500">Exam Attendance <b className="text-neutral-800">{primaryExamCycle.examAttendancePct === null ? "—" : `${primaryExamCycle.examAttendancePct}%`}</b></span>
                    <span className="text-neutral-500">Result Completion <b className="text-neutral-800">{primaryExamCycle.resultCompletionPct === null ? "—" : `${primaryExamCycle.resultCompletionPct}%`}</b></span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top / at-risk breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Student Risk Breakdown</CardTitle>
              <Link href="/owner/performance" className="text-xs font-medium text-primary-600 hover:underline">View all &rarr;</Link>
            </div>
          </CardHeader>
          <CardContent>
            {academicCount + attendanceCount + bothCount === 0 ? (
              <EmptyState title={t("intelligence.noStudentEnoughData")} />
            ) : (
              <>
                <RiskDonut academic={academicCount} attendance={attendanceCount} both={bothCount} />
                {highestRiskClassId && (
                  <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">
                    Highest risk: <b><Bdi>{classNameById.get(highestRiskClassId) ?? "—"}</Bdi></b> &middot; <Bdi>{highestRiskCount}</Bdi> students
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title="Nothing to show yet" description="Finalized exam sets and resolved alerts will appear here." />
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{item.text}</p>
                      <p className="truncate text-xs text-neutral-500"><Bdi>{item.meta}</Bdi></p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

