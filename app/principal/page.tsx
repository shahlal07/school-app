import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/examination/alert-card";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import { ScoreRing, TrendChart, StatTile, deltaText, type TrendPoint } from "@/components/shared/dashboard-charts";

interface StatCard {
  label: string;
  value: number;
  href?: string;
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

interface ExamSetRow {
  id: string;
  class_id: string;
  set_number: number;
  status: string;
  completed_on: string | null;
}

interface TestResultRow {
  schedule_item_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_absent: boolean;
  is_pass: boolean | null;
}

interface FocusArea {
  label: string;
  href: string;
}

const secondaryLinkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

const URGENT_ALERT_DISPLAY_LIMIT = 5;
const IN_PROGRESS_EXAM_SET_STATUSES = ["planned", "active", "awaiting_completion"];

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

/**
 * Principal landing page - a school-wide oversight brief matching the same
 * hero/ScoreRing/TrendChart/Recent-Activity visual language as
 * app/owner/page.tsx (shared components in components/shared/dashboard-charts.tsx),
 * but scoped to the principal's read-only oversight role: no academic-write
 * controls (schedules/papers/results creation stays owner+coordinator per
 * can_manage_academics()), only the real operational backlog/urgent-danger
 * data this page already computed pre-redesign, now presented as a unified
 * "Key Focus Areas" list instead of a scattered stat-card grid.
 */
export default async function PrincipalHomePage() {
  const profile = await requireAnyRole(["owner", "principal"]);
  const supabase = createClient();
  const t = await getT();

  function scheduleStatusLabel(status: string): string {
    switch (status) {
      case "upcoming":
        return t("principal.scheduleStatus.upcoming");
      case "skipped":
        return t("principal.scheduleStatus.skipped");
      case "rescheduled":
        return t("principal.scheduleStatus.rescheduled");
      case "scheduled":
        return t("status.scheduled");
      case "draft":
        return t("status.draft");
      case "completed":
        return t("status.completed");
      case "cancelled":
        return t("status.cancelled");
      default:
        return status;
    }
  }

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
    intelligence,
    dailyAttendance,
    inProgressExamSetsRes,
    completedExamSetsRes
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true),
    supabase.from("subjects").select("id"),
    supabase.from("chapters").select("subject_id"),
    supabase.from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, user_id, full_name").eq("role", "teacher"),
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, teacher_id, test_type, status, scheduled_date, title")
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", tomorrowIso)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("id, name"),
    supabase.from("subjects").select("id, name"),
    supabase.from("exam_papers").select("status, print_status"),
    supabase.from("result_submissions").select("status"),
    getAcademicIntelligenceData(),
    getDailyAttendanceReport(todayIso),
    supabase
      .from("exam_sets")
      .select("id, class_id, set_number, status, completed_on")
      .in("status", IN_PROGRESS_EXAM_SET_STATUSES),
    supabase
      .from("exam_sets")
      .select("id, class_id, set_number, status, completed_on")
      .eq("status", "completed")
      .order("completed_on", { ascending: false })
      .limit(4)
  ]);

  const totalClasses = classesCountRes.count ?? 0;
  const totalActiveSubjects = activeSubjectsCountRes.count ?? 0;
  const totalActiveStudents = activeStudentsCountRes.count ?? 0;
  const totalActiveTeachers = activeTeachersCountRes.count ?? 0;

  const allSubjectIds = ((allSubjectsRes.data as { id: string }[] | null) ?? []).map((subject) => subject.id);
  const subjectIdsWithChapters = new Set(
    ((allChaptersRes.data as { subject_id: string }[] | null) ?? []).map((chapter) => chapter.subject_id)
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
  const subjectNameById = new Map(((subjectNamesRes.data as NameRow[] | null) ?? []).map((s) => [s.id, s.name]));

  // ---- Urgent dangers ----
  const openAlerts = (openAlertsRes.data as AlertRow[] | null) ?? [];
  const urgentDangers: AlertWithTeacher[] = openAlerts
    .filter((a) => a.severity === "urgent" || a.severity === "critical")
    .map((alert) => ({
      ...alert,
      teacherName: alert.teacher_id ? teacherNameById.get(alert.teacher_id) ?? null : null
    }));
  const urgentDangersShown = urgentDangers.slice(0, URGENT_ALERT_DISPLAY_LIMIT);
  const urgentDangersRemaining = urgentDangers.length - urgentDangersShown.length;

  // ---- Students at risk ----
  const studentsAtRiskCount = openAlerts.filter((a) => a.type === "student_performance_warning").length;

  // ---- Teachers behind ----
  const teachersBehindIds = new Set<string>();
  for (const alert of openAlerts) {
    if (alert.type === "teacher_compliance_warning" && alert.teacher_id) {
      teachersBehindIds.add(alert.teacher_id);
    }
  }
  const paperOrTestAlertCountByTeacher = new Map<string, number>();
  for (const alert of openAlerts) {
    if ((alert.type === "paper_missing" || alert.type === "test_overdue") && alert.teacher_id) {
      paperOrTestAlertCountByTeacher.set(alert.teacher_id, (paperOrTestAlertCountByTeacher.get(alert.teacher_id) ?? 0) + 1);
    }
  }
  paperOrTestAlertCountByTeacher.forEach((count, teacherId) => {
    if (count >= 2) teachersBehindIds.add(teacherId);
  });
  const teachersBehindCount = teachersBehindIds.size;

  // ---- Exams today/tomorrow ----
  const upcomingScheduleItems = (upcomingScheduleRes.data as ScheduleItemBriefRow[] | null) ?? [];
  const examsToday = upcomingScheduleItems.filter((item) => item.scheduled_date === todayIso);
  const examsTomorrow = upcomingScheduleItems.filter((item) => item.scheduled_date === tomorrowIso);

  // ---- Paper approval / print / result backlogs ----
  const examPapers = (examPapersRes.data as ExamPaperBriefRow[] | null) ?? [];
  const paperApprovalBacklog = examPapers.filter((p) => p.status === "submitted" || p.status === "under_review").length;
  const printBacklog = examPapers.filter((p) => p.status === "approved" && p.print_status !== "printed").length;
  const resultSubmissions = (resultSubmissionsRes.data as ResultSubmissionBriefRow[] | null) ?? [];
  const resultFinalizationBacklog = resultSubmissions.filter((r) => r.status === "submitted").length;

  // ---- Exam cycle pending count (in-progress exam sets) ----
  const inProgressExamSetsCount = ((inProgressExamSetsRes.data as ExamSetRow[] | null) ?? []).length;

  // ---- Key Focus Areas: one unified real-data list ----
  const focusAreas: FocusArea[] = [];
  if (teachersBehindCount > 0) {
    focusAreas.push({
      label: `${teachersBehindCount} ${teachersBehindCount === 1 ? "teacher" : "teachers"} behind on result submission`,
      href: "/principal/alerts"
    });
  }
  if (studentsAtRiskCount > 0) {
    focusAreas.push({
      label: `${studentsAtRiskCount} ${studentsAtRiskCount === 1 ? "student" : "students"} flagged at academic risk`,
      href: "/principal/alerts"
    });
  }
  if (paperApprovalBacklog > 0) {
    focusAreas.push({ label: `${paperApprovalBacklog} exam papers awaiting approval`, href: "/principal/papers" });
  }
  if (printBacklog > 0) {
    focusAreas.push({ label: `${printBacklog} approved papers not yet printed`, href: "/principal/papers" });
  }
  if (resultFinalizationBacklog > 0) {
    focusAreas.push({ label: `${resultFinalizationBacklog} result sets awaiting finalization`, href: "/principal/results" });
  }
  if (inProgressExamSetsCount > 0) {
    focusAreas.push({ label: `${inProgressExamSetsCount} exam ${inProgressExamSetsCount === 1 ? "cycle" : "cycles"} in progress`, href: "/coordinator/exam-sets" });
  }

  // ---- Attendance % today ----
  const attendanceRows = dailyAttendance.rows;
  const attendanceTotals = attendanceRows.reduce(
    (acc, row) => ({ total: acc.total + row.total_students, present: acc.present + row.present_count }),
    { total: 0, present: 0 }
  );
  const attendancePct = attendanceTotals.total > 0 ? Math.round((attendanceTotals.present / attendanceTotals.total) * 1000) / 10 : null;

  // ---- Health metrics ----
  const [examReadinessMetric] = intelligence.healthMetrics;

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
      return { setLabel: `${classNameById.get(set.class_id) ?? "?"} #${set.set_number}`, average, passRate };
    });
  }

  // ---- Recent activity ----
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
      .map((row) => ({ id: `alert-${row.id}`, text: "Alert resolved", meta: row.message, at: row.resolved_at as string })))
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  const statCards: StatCard[] = [
    { label: t("ownerDashboard.classes"), value: totalClasses, href: "/principal/syllabus" },
    { label: t("ownerDashboard.activeSubjects"), value: totalActiveSubjects, href: "/principal/syllabus" },
    { label: t("ownerDashboard.activeStudents"), value: totalActiveStudents, href: "/principal/students" },
    { label: t("ownerDashboard.activeTeachers"), value: totalActiveTeachers }
  ];

  const showSetupPrompts = totalActiveStudents === 0;
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
            <h1 className="text-lg font-semibold">{greetingWord}, <Bdi>{profile.full_name}</Bdi></h1>
            <p className="mt-1 text-sm text-primary-100">{t("ownerDashboard.subtitle")}</p>
          </div>
          <div className="text-right text-xs text-primary-100">
            <p><Bdi>{dayName}</Bdi></p>
            <p className="mt-0.5">Academic Year <Bdi>{academicYear}</Bdi></p>
          </div>
        </div>
      </div>

      {/* Overall Academic Health */}
      <Card>
        <CardContent className="py-4">
          {intelligence.healthMetrics.length === 0 ? (
            <EmptyState title={t("intelligence.notEnoughDataForScore")} description={t("intelligence.notEnoughDataForScoreDescription")} />
          ) : (
            <>
              <Link href="/principal/academic-health" className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <ScoreRing value={intelligence.healthScore} />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Overall Academic Health</p>
                    <p className="mt-1 text-xs text-neutral-500">School-wide academic + attendance oversight</p>
                  </div>
                </div>
                <span className="text-neutral-300">&rarr;</span>
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatTile label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} delta={deltaText(null, "%")} deltaSuffix="today" />
                <StatTile label={t("intelligence.examReadiness")} value={`${examReadinessMetric?.score ?? 0}%`} delta={deltaText(null, "%")} deltaSuffix="" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Key Focus Areas */}
      <Card>
        <CardHeader><CardTitle>Key Focus Areas</CardTitle></CardHeader>
        <CardContent>
          {focusAreas.length === 0 ? (
            <EmptyState title={t("intelligence.nothingUrgent")} description={t("intelligence.noOpenAlerts")} />
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {focusAreas.map((area) => (
                <li key={area.label}>
                  <Link href={area.href} className="flex items-center justify-between gap-3 py-2.5 text-sm text-neutral-700 hover:text-primary-700">
                    <span><Bdi>{area.label}</Bdi></span>
                    <span className="text-neutral-300">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Urgent dangers */}
      <Card>
        <CardHeader><CardTitle>{t("intelligence.urgentDangers")}</CardTitle></CardHeader>
        <CardContent>
          {urgentDangersShown.length === 0 ? (
            <EmptyState title={t("intelligence.nothingUrgent")} description={t("intelligence.noOpenAlerts")} />
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {urgentDangersShown.map((alert) => (
                  <li key={alert.id}><AlertCard alert={alert} showTeacher /></li>
                ))}
              </ul>
              {urgentDangersRemaining > 0 && (
                <Link href="/principal/alerts" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
                  <Bdi>{urgentDangersRemaining}</Bdi>{" "}
                  {urgentDangersRemaining === 1 ? t("principal.dashboard.moreUrgentAlert") : t("principal.dashboard.moreUrgentAlerts")} &rarr;
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Exams today/tomorrow */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            { titleKey: "ownerDashboard.examsToday", emptyKey: "ownerDashboard.noExamsToday", items: examsToday },
            { titleKey: "ownerDashboard.examsTomorrow", emptyKey: "ownerDashboard.noExamsTomorrow", items: examsTomorrow }
          ] as const
        ).map(({ titleKey, emptyKey, items }) => (
          <Card key={titleKey}>
            <CardHeader><CardTitle>{t(titleKey)}</CardTitle></CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-500">{t(emptyKey)}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900"><Bdi>{item.title}</Bdi></p>
                        <p className="text-xs text-neutral-500">
                          <Bdi>{classNameById.get(item.class_id) ?? t("principal.common.unknownClass")}</Bdi> &middot;{" "}
                          <Bdi>{subjectNameById.get(item.subject_id) ?? t("principal.common.unknownSubject")}</Bdi> &middot;{" "}
                          <Bdi>{formatDate(item.scheduled_date)}</Bdi>
                        </p>
                      </div>
                      <Badge variant={scheduleStatusBadgeVariant[item.status] ?? "neutral"}>{scheduleStatusLabel(item.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
            <>
              <TrendChart points={trendPoints} />
              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-600" /> Average Percentage</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#2563eb" }} /> Pass Rate</span>
              </div>
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

      {/* School setup snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="py-5">
                  <p className="text-2xl font-semibold text-neutral-900"><Bdi>{stat.value}</Bdi></p>
                  <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={stat.label} className="h-full">
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-neutral-900"><Bdi>{stat.value}</Bdi></p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("ownerDashboard.syllabusCoverage")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-neutral-900">
              <Bdi>{subjectsWithSyllabus}</Bdi> of <Bdi>{totalSubjects}</Bdi>
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {t("ownerDashboard.subjectsHaveSyllabus")}
              {subjectsWithoutSyllabus > 0 && (
                <>
                  {" "}
                  <Bdi>{subjectsWithoutSyllabus}</Bdi>{" "}
                  {subjectsWithoutSyllabus === 1 ? t("principal.dashboard.subjectNeedsChapters") : t("principal.dashboard.subjectsNeedChapters")}
                </>
              )}
            </p>
            <Link href="/principal/syllabus" className={`${secondaryLinkButtonClasses} mt-4`}>
              {t("principal.dashboard.viewSyllabus")}
            </Link>
          </CardContent>
        </Card>

        {showSetupPrompts && (
          <Card>
            <CardHeader><CardTitle>{t("ownerDashboard.getSetUp")}</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{t("ownerDashboard.addStudents")}</p>
                    <p className="text-sm text-neutral-500">{t("ownerDashboard.rosterEmpty")}</p>
                  </div>
                  <Link href="/principal/students" className={linkButtonClasses}>
                    {t("ownerDashboard.addStudents")}
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
