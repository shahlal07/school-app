import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/examination/alert-card";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

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

const secondaryLinkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

const URGENT_ALERT_DISPLAY_LIMIT = 5;

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
 * Principal landing page - enhanced in place (rather than a separate route)
 * into an executive "what needs attention today?" daily brief, since
 * principal already lands here on login via the role->route map in
 * app/page.tsx and this was already the principal's one dashboard. The
 * original setup-snapshot content (classes/subjects/students/teachers +
 * syllabus coverage) is kept below the brief, unchanged, since it's still
 * useful "how is the school configured" context - just no longer the first
 * thing a principal sees.
 *
 * Every section below is backed by a real query against the live schema
 * (see the query comments on each block) - this app has near-zero seeded
 * academic activity right now, so most sections are expected to render
 * their honest empty state, not fabricated numbers.
 *
 * Does not touch lib/examination/academic-intelligence-data.ts or
 * components/examination/academic-intelligence.tsx - the "Students at risk"
 * section below is a plain count of open student_performance_warning alerts
 * (per spec), not a reimplementation of that file's risk scoring, and the
 * school's health score itself is deliberately left to
 * /principal/academic-health (linked from the brief, not duplicated here).
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
    resultSubmissionsRes
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("is_active", true),
    supabase.from("subjects").select("id"),
    supabase.from("chapters").select("subject_id"),
    // 1. Urgent dangers: open alerts, most recent first. The
    // scan_examination_compliance() Postgres function is the single source
    // of truth for danger detection - this just reads and groups its output.
    supabase.from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, user_id, full_name").eq("role", "teacher"),
    // 2. Exams today/tomorrow, same schedule_items.scheduled_date pattern as
    // app/principal/schedule/page.tsx, narrowed to a 2-day window and
    // excluding cancelled items.
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, teacher_id, test_type, status, scheduled_date, title")
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", tomorrowIso)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("id, name"),
    supabase.from("subjects").select("id, name"),
    // 3 & 4. Paper approval backlog + print backlog, same exam_papers.status
    // / print_status columns as app/principal/papers/page.tsx and
    // app/coordinator/papers/page.tsx.
    supabase.from("exam_papers").select("status, print_status"),
    // 7. Result finalization backlog: result_submissions awaiting review
    // (status='submitted', per the table's check constraint).
    supabase.from("result_submissions").select("status")
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

  // ---- 5. Students at risk (count only - risk scoring itself lives in the
  // separate academic-intelligence work stream / academic-health page) ----
  const studentsAtRiskCount = openAlerts.filter((a) => a.type === "student_performance_warning").length;

  // ---- 6. Teachers behind: an open teacher_compliance_warning, or 2+ open
  // paper_missing/test_overdue alerts against the same teacher ----
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
    { label: t("ownerDashboard.papersAwaitingApproval"), value: paperApprovalBacklog, href: "/principal/papers" },
    { label: t("ownerDashboard.approvedNotPrinted"), value: printBacklog, href: "/principal/papers" },
    { label: t("ownerDashboard.studentsAtRisk"), value: studentsAtRiskCount, href: "/principal/alerts" },
    { label: t("ownerDashboard.teachersBehind"), value: teachersBehindCount, href: "/principal/alerts" },
    { label: t("ownerDashboard.resultsAwaitingFinalization"), value: resultFinalizationBacklog, href: "/principal/results" }
  ];

  // "Active teachers" is shown as a plain stat, not a link - inviting
  // teachers and managing accounts is owner-only system administration and
  // there is no /principal/teachers page to send this card to.
  const statCards: StatCard[] = [
    { label: t("ownerDashboard.classes"), value: totalClasses, href: "/principal/syllabus" },
    { label: t("ownerDashboard.activeSubjects"), value: totalActiveSubjects, href: "/principal/syllabus" },
    { label: t("ownerDashboard.activeStudents"), value: totalActiveStudents, href: "/principal/students" },
    { label: t("ownerDashboard.activeTeachers"), value: totalActiveTeachers }
  ];

  // Only the students prompt is actionable by a principal - inviting a
  // teacher is a system-administration action reserved for the owner, so
  // that prompt is intentionally not offered here.
  const showSetupPrompts = totalActiveStudents === 0;

  return (
    <main className="p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {t("principal.dashboard.welcomeBack")}, <Bdi>{profile.full_name}</Bdi>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("ownerDashboard.subtitle")}</p>
        </div>
        <Link href="/principal/academic-health" className={secondaryLinkButtonClasses}>
          {t("ownerDashboard.academicHealthScore")} &rarr;
        </Link>
      </div>

      {/* 1. Urgent dangers - the most actionable, most urgent section, so it
          leads the page. */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>{t("intelligence.urgentDangers")}</CardTitle>
        </CardHeader>
        <CardContent>
          {urgentDangersShown.length === 0 ? (
            <EmptyState
              title={t("intelligence.nothingUrgent")}
              description={t("intelligence.noOpenAlerts")}
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
                  href="/principal/alerts"
                  className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
                >
                  <Bdi>{urgentDangersRemaining}</Bdi>{" "}
                  {urgentDangersRemaining === 1
                    ? t("principal.dashboard.moreUrgentAlert")
                    : t("principal.dashboard.moreUrgentAlerts")}{" "}
                  &rarr;
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
            { titleKey: "ownerDashboard.examsToday", emptyKey: "ownerDashboard.noExamsToday", items: examsToday },
            {
              titleKey: "ownerDashboard.examsTomorrow",
              emptyKey: "ownerDashboard.noExamsTomorrow",
              items: examsTomorrow
            }
          ] as const
        ).map(({ titleKey, emptyKey, items }) => (
          <Card key={titleKey}>
            <CardHeader>
              <CardTitle>{t(titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-500">{t(emptyKey)}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900">
                          <Bdi>{item.title}</Bdi>
                        </p>
                        <p className="text-xs text-neutral-500">
                          <Bdi>
                            {classNameById.get(item.class_id) ?? t("principal.common.unknownClass")}
                          </Bdi>{" "}
                          &middot;{" "}
                          <Bdi>
                            {subjectNameById.get(item.subject_id) ?? t("principal.common.unknownSubject")}
                          </Bdi>{" "}
                          &middot; <Bdi>{formatDate(item.scheduled_date)}</Bdi>
                        </p>
                      </div>
                      <Badge variant={scheduleStatusBadgeVariant[item.status] ?? "neutral"}>
                        {scheduleStatusLabel(item.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
                  <Bdi>{stat.value}</Bdi>
                </p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* School setup snapshot (previously the whole page) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="py-5">
                  <p className="text-2xl font-semibold text-neutral-900">
                    <Bdi>{stat.value}</Bdi>
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={stat.label} className="h-full">
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-neutral-900">
                  <Bdi>{stat.value}</Bdi>
                </p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("ownerDashboard.syllabusCoverage")}</CardTitle>
          </CardHeader>
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
                  {subjectsWithoutSyllabus === 1
                    ? t("principal.dashboard.subjectNeedsChapters")
                    : t("principal.dashboard.subjectsNeedChapters")}
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
            <CardHeader>
              <CardTitle>{t("ownerDashboard.getSetUp")}</CardTitle>
            </CardHeader>
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
