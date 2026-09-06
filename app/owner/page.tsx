import Link from "next/link";

import type { Student } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import {
  computeExamSetReport,
  type ExamSetSubjectSlot,
  type ResultInput,
  type StudentInput
} from "@/lib/examination/exam-set-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/examination/alert-card";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";

interface StatCard {
  label: string;
  value: number;
  href: string;
}

interface ScheduleItemBriefRow {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  test_type: string;
  status: string;
  scheduled_date: string;
  title: string;
}

interface ExamPaperBriefRow {
  status: string;
  print_status: string | null;
}

interface ResultSubmissionBriefRow {
  status: string;
}

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
  dayLabel: string;
  nextSubjectLabel: string;
  overallAverage: number | null;
}

const secondaryLinkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

const URGENT_ALERT_DISPLAY_LIMIT = 5;

const IN_PROGRESS_EXAM_SET_STATUSES: ExamSetStatus[] = ["planned", "active", "awaiting_completion"];

const scheduleStatusBadgeVariant: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  upcoming: "info",
  scheduled: "info",
  draft: "neutral",
  completed: "success",
  skipped: "neutral",
  rescheduled: "warning",
  cancelled: "neutral"
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function healthStatusWord(score: number): { word: string; className: string } {
  if (score >= 80) return { word: "Healthy", className: "text-green-600" };
  if (score >= 60) return { word: "Watch", className: "text-amber-600" };
  return { word: "Critical", className: "text-red-600" };
}

/**
 * Owner landing page - brought up to the same "executive daily brief"
 * standard as app/principal/page.tsx (built earlier the same day), which
 * this page copies almost verbatim for its alerts/exams-today-tomorrow/
 * operational-backlog sections, retargeted to /owner/... routes since the
 * owner has its own copies of those pages (papers, schedule, alerts,
 * results, academic-health all exist under /owner already). See that file's
 * header comment for the query provenance this mirrors.
 *
 * On top of the principal's shape, the owner gets two owner-specific
 * sections:
 *
 * 1. An "Academic Health hero" at the very top, sourced directly from
 *    lib/examination/academic-intelligence-data.ts's getAcademicIntelligenceData()
 *    - healthScore and healthMetrics are used as-is, not recomputed here.
 *    The full breakdown (topic heatmap, teacher compliance, intervention
 *    effectiveness, etc.) stays exclusive to /owner/academic-health; this
 *    page only shows the headline number plus the 2-3 lowest-scoring
 *    metrics so the score is explainable at a glance.
 *
 * 2. A "Current Exam Cycle" section showing exam_sets rows still in
 *    progress (status planned/active/awaiting_completion), one card per
 *    class with an active cycle - "Day X of Y" plus a running average via
 *    lib/examination/exam-set-analytics.ts's computeExamSetReport (imported
 *    directly, not reimplemented), fed with whatever results exist so far.
 *    Query/join style copied from app/coordinator/exam-sets/page.tsx and
 *    app/coordinator/exam-sets/[id]/page.tsx (read-only reference only -
 *    neither file was touched).
 *
 * This app has very little real academic activity seeded right now, so most
 * sections are expected to legitimately render their honest empty state.
 */
export default async function OwnerHomePage() {
  const supabase = createClient();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const [
    classesCountRes,
    activeSubjectsCountRes,
    activeStudentsCountRes,
    activeTeachersCountRes,
    allSubjectsRes,
    allChaptersRes,
    openAlertsRes,
    teachersRes,
    upcomingScheduleRes,
    classNamesRes,
    subjectNamesRes,
    examPapersRes,
    resultSubmissionsRes,
    inProgressExamSetsRes,
    intelligence
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("is_active", true),
    supabase.from("subjects").select("id"),
    supabase.from("chapters").select("subject_id"),
    // 1. Urgent dangers: open alerts, most recent first - same source as
    // the principal brief (scan_examination_compliance() is the single
    // source of truth for danger detection).
    supabase.from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, user_id, full_name").eq("role", "teacher"),
    // 2. Exams today/tomorrow.
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, teacher_id, test_type, status, scheduled_date, title")
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", tomorrowIso)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("id, name"),
    supabase.from("subjects").select("id, name"),
    // 3 & 4. Paper approval backlog + print backlog.
    supabase.from("exam_papers").select("status, print_status"),
    // 7. Result finalization backlog.
    supabase.from("result_submissions").select("status"),
    // Current exam cycle: any exam_sets row still in progress.
    supabase
      .from("exam_sets")
      .select("id, class_id, set_number, status")
      .in("status", IN_PROGRESS_EXAM_SET_STATUSES),
    // Owner-specific health hero - computed once, shared with
    // /owner/academic-health, never duplicated here.
    getAcademicIntelligenceData()
  ]);

  const totalClasses = classesCountRes.count ?? 0;
  const totalActiveSubjects = activeSubjectsCountRes.count ?? 0;
  const totalActiveStudents = activeStudentsCountRes.count ?? 0;
  const totalActiveTeachers = activeTeachersCountRes.count ?? 0;

  const allSubjectIds = ((allSubjectsRes.data as { id: string }[] | null) ?? []).map(
    (subject) => subject.id
  );
  const subjectIdsWithChapters = new Set(
    ((allChaptersRes.data as { subject_id: string }[] | null) ?? []).map(
      (chapter) => chapter.subject_id
    )
  );

  const totalSubjects = allSubjectIds.length;
  const subjectsWithSyllabus = allSubjectIds.filter((id) => subjectIdsWithChapters.has(id)).length;
  const subjectsWithoutSyllabus = totalSubjects - subjectsWithSyllabus;

  // ---- Shared lookups ----
  const teachers = (teachersRes.data as { id: string; user_id: string; full_name: string }[] | null) ?? [];
  const teacherNameById = new Map<string, string>();
  for (const teacher of teachers) {
    teacherNameById.set(teacher.id, teacher.full_name);
    teacherNameById.set(teacher.user_id, teacher.full_name);
  }
  const classNameById = new Map(((classNamesRes.data as NameRow[] | null) ?? []).map((c) => [c.id, c.name]));
  const subjectNameById = new Map(
    ((subjectNamesRes.data as NameRow[] | null) ?? []).map((s) => [s.id, s.name])
  );

  // ---- 1. Urgent dangers ----
  const openAlerts = (openAlertsRes.data as AlertRow[] | null) ?? [];
  const urgentDangers: AlertWithTeacher[] = openAlerts
    .filter((a) => a.severity === "urgent" || a.severity === "critical")
    .map((alert) => ({
      ...alert,
      teacherName: alert.teacher_id ? teacherNameById.get(alert.teacher_id) ?? null : null
    }));
  const urgentDangersShown = urgentDangers.slice(0, URGENT_ALERT_DISPLAY_LIMIT);
  const urgentDangersRemaining = urgentDangers.length - urgentDangersShown.length;

  // ---- 5. Students at risk (count only) ----
  const studentsAtRiskCount = openAlerts.filter((a) => a.type === "student_performance_warning").length;

  // ---- 6. Teachers behind ----
  const teachersBehindIds = new Set<string>();
  for (const alert of openAlerts) {
    if (alert.type === "teacher_compliance_warning" && alert.teacher_id) {
      teachersBehindIds.add(alert.teacher_id);
    }
  }
  const paperOrTestAlertCountByTeacher = new Map<string, number>();
  for (const alert of openAlerts) {
    if ((alert.type === "paper_missing" || alert.type === "test_overdue") && alert.teacher_id) {
      paperOrTestAlertCountByTeacher.set(
        alert.teacher_id,
        (paperOrTestAlertCountByTeacher.get(alert.teacher_id) ?? 0) + 1
      );
    }
  }
  paperOrTestAlertCountByTeacher.forEach((count, teacherId) => {
    if (count >= 2) teachersBehindIds.add(teacherId);
  });
  const teachersBehindCount = teachersBehindIds.size;

  // ---- 2. Exams today/tomorrow ----
  const upcomingScheduleItems = (upcomingScheduleRes.data as ScheduleItemBriefRow[] | null) ?? [];
  const examsToday = upcomingScheduleItems.filter((item) => item.scheduled_date === todayIso);
  const examsTomorrow = upcomingScheduleItems.filter((item) => item.scheduled_date === tomorrowIso);

  // ---- 3 & 4. Paper approval backlog + print backlog ----
  const examPapers = (examPapersRes.data as ExamPaperBriefRow[] | null) ?? [];
  const paperApprovalBacklog = examPapers.filter(
    (p) => p.status === "submitted" || p.status === "under_review"
  ).length;
  const printBacklog = examPapers.filter(
    (p) => p.status === "approved" && p.print_status !== "printed"
  ).length;

  // ---- 7. Result finalization backlog ----
  const resultSubmissions = (resultSubmissionsRes.data as ResultSubmissionBriefRow[] | null) ?? [];
  const resultFinalizationBacklog = resultSubmissions.filter((r) => r.status === "submitted").length;

  const backlogStats: { label: string; value: number; href: string }[] = [
    { label: "Papers awaiting approval", value: paperApprovalBacklog, href: "/owner/papers" },
    { label: "Approved, not yet printed", value: printBacklog, href: "/owner/papers" },
    { label: "Students at risk", value: studentsAtRiskCount, href: "/owner/alerts" },
    { label: "Teachers behind", value: teachersBehindCount, href: "/owner/alerts" },
    { label: "Results awaiting finalization", value: resultFinalizationBacklog, href: "/owner/results" }
  ];

  const statCards: StatCard[] = [
    { label: "Classes", value: totalClasses, href: "/owner/syllabus" },
    { label: "Active subjects", value: totalActiveSubjects, href: "/owner/syllabus" },
    { label: "Active students", value: totalActiveStudents, href: "/owner/students" },
    { label: "Active teachers", value: totalActiveTeachers, href: "/owner/teachers" }
  ];

  const needsTeacher = totalActiveTeachers === 0;
  const needsStudents = totalActiveStudents === 0;
  const showSetupPrompts = needsTeacher || needsStudents;

  // ---- Current Exam Cycle ----
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
    const scheduleItemIds = examSetSubjects
      .map((row) => row.schedule_item_id)
      .filter((id): id is string => Boolean(id));

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

    const scheduleItemStatusById = new Map(
      ((scheduleItemsRes.data as ScheduleItemStatusRow[] | null) ?? []).map((si) => [si.id, si.status])
    );
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
          ? subjectNameById.get(nextRow.subject_id) ?? "Unknown subject"
          : totalSlots > 0
            ? "All subjects conducted"
            : "No subjects scheduled yet";

        const subjectSlots: ExamSetSubjectSlot[] = rows.map((row) => ({
          subjectId: row.subject_id,
          subjectName: subjectNameById.get(row.subject_id) ?? "Unknown subject",
          sequence: row.sequence,
          scheduledDate: row.scheduled_date,
          scheduleItemId: row.schedule_item_id,
          teacherId: null,
          teacherName: null
        }));
        const resultInputs: ResultInput[] = rows.flatMap((row) =>
          row.schedule_item_id
            ? (resultsByScheduleItem.get(row.schedule_item_id) ?? []).map((r) => ({
                scheduleItemId: r.schedule_item_id,
                studentId: r.student_id,
                marksObtained: r.marks_obtained,
                totalMarks: r.total_marks,
                isAbsent: r.is_absent,
                isPass: r.is_pass
              }))
            : []
        );
        const studentInputs = studentsByClassId.get(set.class_id) ?? [];
        const report = computeExamSetReport(subjectSlots, studentInputs, resultInputs);

        return {
          examSetId: set.id,
          className: classNameById.get(set.class_id) ?? "Unknown class",
          setNumber: set.set_number,
          dayLabel: `Day ${doneSlots} of ${totalSlots}`,
          nextSubjectLabel,
          overallAverage: report.overallAverage
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }

  const healthStatus = healthStatusWord(intelligence.healthScore);
  const lowestHealthMetrics = intelligence.healthMetrics
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <main className="p-4 sm:p-6">
      {/* Academic Health hero */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Owner console</h1>
          <p className="mt-1 text-sm text-neutral-500">What needs your attention today.</p>
        </div>
        <Link href="/owner/academic-health" className={secondaryLinkButtonClasses}>
          Academic health score &rarr;
        </Link>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>School academic health</CardTitle>
        </CardHeader>
        <CardContent>
          {intelligence.healthMetrics.length === 0 ? (
            <EmptyState
              title="Not enough academic data yet to calculate a health score"
              description="Once exams are scheduled, papers are submitted, and results come in, a school health score will appear here."
            />
          ) : (
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-4xl font-semibold text-neutral-900">{intelligence.healthScore}</p>
                <p className="text-sm text-neutral-500">
                  out of 100 &middot; <span className={`font-medium ${healthStatus.className}`}>{healthStatus.word}</span>
                </p>
              </div>
              <div className="min-w-[260px] flex-1 space-y-1.5">
                <p className="text-xs font-medium text-neutral-500">What&apos;s dragging the score down</p>
                {lowestHealthMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-700">{metric.label}</span>
                    <span className="text-neutral-500">
                      {metric.score}% &middot; {metric.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Urgent dangers */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Urgent dangers</CardTitle>
        </CardHeader>
        <CardContent>
          {urgentDangersShown.length === 0 ? (
            <EmptyState
              title="Nothing urgent right now"
              description="No open alerts are marked urgent or critical."
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {urgentDangersShown.map((alert) => (
                  <li key={alert.id}>
                    <AlertCard alert={alert} showTeacher />
                  </li>
                ))}
              </ul>
              {urgentDangersRemaining > 0 && (
                <Link
                  href="/owner/alerts"
                  className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
                >
                  {urgentDangersRemaining} more urgent alert{urgentDangersRemaining === 1 ? "" : "s"} &rarr;
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Exams today/tomorrow */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(
          [
            { label: "Today", items: examsToday },
            { label: "Tomorrow", items: examsTomorrow }
          ] as const
        ).map(({ label, items }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle>Exams {label.toLowerCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-500">No exams scheduled {label.toLowerCase()}.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">{item.title}</p>
                        <p className="text-xs text-neutral-500">
                          {classNameById.get(item.class_id) ?? "Unknown class"} &middot;{" "}
                          {subjectNameById.get(item.subject_id) ?? "Unknown subject"} &middot;{" "}
                          {formatDate(item.scheduled_date)}
                        </p>
                      </div>
                      <Badge variant={scheduleStatusBadgeVariant[item.status] ?? "neutral"}>
                        {item.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Exam Cycle */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Current exam cycle</CardTitle>
        </CardHeader>
        <CardContent>
          {examCycleCards.length === 0 ? (
            <EmptyState
              title="No exam cycle currently in progress."
              description="Start a new exam set to see per-class progress here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {examCycleCards.map((card) => (
                <div key={card.examSetId} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{card.className}</p>
                    <Badge variant="neutral">Set #{card.setNumber}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{card.dayLabel}</p>
                  <p className="mt-2 text-sm text-neutral-700">Next up: {card.nextSubjectLabel}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Running average:{" "}
                    {card.overallAverage === null ? "not enough graded results yet" : `${card.overallAverage}%`}
                  </p>
                </div>
              ))}
            </div>
          )}
          {examCycleCards.length === 0 && (
            <Link href="/coordinator/exam-sets" className={`${secondaryLinkButtonClasses} mt-4`}>
              View exam sets
            </Link>
          )}
        </CardContent>
      </Card>

      {/* 3-7. Operational backlogs at a glance */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {backlogStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                <p
                  className={`text-2xl font-semibold ${
                    stat.value > 0 ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* School setup snapshot (previously the whole page) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Syllabus coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-neutral-900">
              {subjectsWithSyllabus} of {totalSubjects}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              subjects have a syllabus started.
              {subjectsWithoutSyllabus > 0 && (
                <>
                  {" "}
                  {subjectsWithoutSyllabus} subject
                  {subjectsWithoutSyllabus === 1 ? "" : "s"} still need
                  {subjectsWithoutSyllabus === 1 ? "s" : ""} chapters added.
                </>
              )}
            </p>
            <Link href="/owner/syllabus" className={`${secondaryLinkButtonClasses} mt-4`}>
              Manage syllabus
            </Link>
          </CardContent>
        </Card>

        {showSetupPrompts && (
          <Card>
            <CardHeader>
              <CardTitle>Get set up</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {needsTeacher && (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Invite a teacher</p>
                      <p className="text-sm text-neutral-500">No teacher accounts yet.</p>
                    </div>
                    <Link href="/owner/teachers" className={linkButtonClasses}>
                      Invite teacher
                    </Link>
                  </li>
                )}
                {needsStudents && (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Add students</p>
                      <p className="text-sm text-neutral-500">The student roster is empty.</p>
                    </div>
                    <Link href="/owner/students" className={linkButtonClasses}>
                      Add students
                    </Link>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
