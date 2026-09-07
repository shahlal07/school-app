import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/get-translator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Bdi } from "@/components/shared/bdi";
import type { Chapter, Class, ClassTeacher, Section, Subject, Topic } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { TeacherScheduleCard, type TeacherScheduleItem } from "@/components/examination/teacher-schedule-card";

interface PaperRow {
  id: string;
  schedule_item_id: string;
  status: string;
  print_status: string;
}
interface ResultRow { schedule_item_id: string; }

interface RecentResultRow {
  schedule_item_id: string;
  entered_at: string;
}
interface ResolvedAlertRow {
  id: string;
  message: string;
  resolved_at: string | null;
}

function pakistanDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function statusLabel(t: (key: string) => string, status: string): string {
  const key: Record<string, string> = {
    approved: "status.approved",
    submitted: "status.submitted",
    draft: "status.draft",
    not_started: "status.notStarted",
    under_review: "status.underReview",
    conducted: "status.conducted",
    results_pending: "status.resultsPending",
    completed: "status.completed"
  };
  return key[status] ? t(key[status]) : status.replaceAll("_", " ");
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (["approved", "conducted", "completed", "printed"].includes(status)) return "success";
  if (["draft", "queued", "results_pending"].includes(status)) return "warning";
  if (status === "rejected") return "danger";
  return "info";
}

export default async function TeacherHomePage() {
  const t = await getT();
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const [scheduleRes, classesRes, sectionsRes, subjectsRes, chaptersRes, topicsRes, alertsRes, messagesRes, classTeacherRes] = await Promise.all([
    supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("topics").select("*"),
    supabase.from("alerts").select("id").eq("status", "open"),
    profile ? supabase.from("messages").select("id").eq("recipient_id", profile.user_id).is("read_at", null) : Promise.resolve({ data: [] }),
    profile ? supabase.from("class_teachers").select("*").eq("teacher_id", profile.user_id).maybeSingle() : Promise.resolve({ data: null })
  ]);

  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const classById = new Map(((classesRes.data as Class[] | null) ?? []).map((c) => [c.id, c]));
  const sectionById = new Map(((sectionsRes.data as Section[] | null) ?? []).map((s) => [s.id, s]));
  const subjectById = new Map(((subjectsRes.data as Subject[] | null) ?? []).map((s) => [s.id, s]));
  const chapterById = new Map(((chaptersRes.data as Chapter[] | null) ?? []).map((c) => [c.id, c]));
  const topicById = new Map(((topicsRes.data as Topic[] | null) ?? []).map((t) => [t.id, t]));
  const openAlertCount = (alertsRes.data as { id: string }[] | null)?.length ?? 0;
  const unreadMessageCount = (messagesRes.data as { id: string }[] | null)?.length ?? 0;
  const classTeacherRow = classTeacherRes.data as ClassTeacher | null;
  const homeroomLabel = classTeacherRow
    ? `${classById.get(classTeacherRow.class_id)?.name ?? "Class"}-${sectionById.get(classTeacherRow.section_id)?.name ?? "Section"}`
    : null;

  const items: TeacherScheduleItem[] = scheduleItems.map((item) => ({
    ...item,
    className: classById.get(item.class_id)?.name ?? null,
    subjectName: subjectById.get(item.subject_id)?.name ?? null,
    chapterName: item.chapter_id ? chapterById.get(item.chapter_id)?.name ?? null : null,
    topicName: item.topic_id ? topicById.get(item.topic_id)?.name ?? null : null
  }));

  const todayStr = pakistanDate();
  const weekAheadDate = new Date(`${todayStr}T12:00:00+05:00`);
  weekAheadDate.setDate(weekAheadDate.getDate() + 7);
  const weekAheadStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(weekAheadDate);
  const todayItems = items.filter((item) => item.scheduled_date === todayStr);
  const upcomingItems = items.filter((item) => item.scheduled_date >= todayStr && item.scheduled_date <= weekAheadStr);
  const upcomingIds = upcomingItems.map((item) => item.id);

  const [papersRes, resultsRes] = upcomingIds.length
    ? await Promise.all([
        supabase.from("exam_papers").select("id,schedule_item_id,status,print_status").in("schedule_item_id", upcomingIds),
        supabase.from("test_results").select("schedule_item_id").in("schedule_item_id", upcomingIds)
      ])
    : [{ data: [] }, { data: [] }];
  const papers = (papersRes.data as PaperRow[] | null) ?? [];
  const results = (resultsRes.data as ResultRow[] | null) ?? [];
  const paperBySchedule = new Map(papers.map((paper) => [paper.schedule_item_id, paper]));
  const completedResultIds = new Set(results.map((result) => result.schedule_item_id));
  const papersAwaitingAction = upcomingItems.filter((item) => {
    const paper = paperBySchedule.get(item.id);
    return !paper || ["draft", "submitted"].includes(paper.status);
  }).length;
  const marksAwaitingEntry = upcomingItems.filter((item) => !completedResultIds.has(item.id)).length;
  const printedCount = papers.filter((paper) => paper.print_status === "printed").length;

  // ---- Recent activity: this teacher's own recently graded results +
  // recently resolved alerts against them (real, timestamped events only) ----
  const [{ data: recentResultsRaw }, { data: recentResolvedRaw }] = profile
    ? await Promise.all([
        supabase
          .from("test_results")
          .select("schedule_item_id, entered_at")
          .eq("entered_by", profile.user_id)
          .order("entered_at", { ascending: false })
          .limit(3),
        supabase
          .from("alerts")
          .select("id, message, resolved_at")
          .eq("status", "resolved")
          .eq("teacher_id", profile.user_id)
          .order("resolved_at", { ascending: false })
          .limit(3)
      ])
    : [{ data: [] }, { data: [] }];
  type ActivityItem = { id: string; text: string; meta: string; at: string };
  const recentResults = (recentResultsRaw as RecentResultRow[] | null) ?? [];
  const seenScheduleItems = new Set<string>();
  const activity: ActivityItem[] = [
    ...recentResults
      .filter((r) => {
        if (seenScheduleItems.has(r.schedule_item_id)) return false;
        seenScheduleItems.add(r.schedule_item_id);
        return true;
      })
      .map((r) => {
        const item = items.find((i) => i.id === r.schedule_item_id);
        return {
          id: `result-${r.schedule_item_id}`,
          text: "Marks entered",
          meta: item ? `${item.subjectName ?? "—"} · ${item.className ?? "—"}` : "—",
          at: r.entered_at
        };
      }),
    ...((recentResolvedRaw as ResolvedAlertRow[] | null) ?? [])
      .filter((a) => a.resolved_at)
      .map((a) => ({ id: `alert-${a.id}`, text: "Alert resolved", meta: a.message, at: a.resolved_at as string }))
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  const firstName = profile?.full_name.split(" ")[0] ?? null;

  return (
    <main className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{t("teacher.home.eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
            {t("teacher.home.greeting")}
            {firstName ? <>, <Bdi>{firstName}</Bdi></> : ` ${t("teacher.home.fallbackName")}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("teacher.home.subtitle")}</p>
        </div>
        {homeroomLabel && <Badge variant="info">{t("teacher.home.classTeacherBadgePrefix")} · <Bdi>{homeroomLabel}</Bdi></Badge>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900"><Bdi>{todayItems.length}</Bdi></p><p className="text-xs text-neutral-500">{t("teacher.home.statTodayClasses")}</p>
        </Link>
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900"><Bdi>{papersAwaitingAction}</Bdi></p><p className="text-xs text-neutral-500">{t("teacher.home.statPaperActions")}</p>
        </Link>
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900"><Bdi>{marksAwaitingEntry}</Bdi></p><p className="text-xs text-neutral-500">{t("teacher.home.statMarksPending")}</p>
        </Link>
        <Link href="/teacher/alerts" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900"><Bdi>{openAlertCount + unreadMessageCount}</Bdi></p><p className="text-xs text-neutral-500">{t("teacher.home.statNeedsAttention")}</p>
        </Link>
      </div>

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.home.quickActionsHeading")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href="/teacher/attendance" className="rounded-xl bg-primary-600 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700">{t("teacher.home.takeAttendance")}</Link>
          <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">{t("teacher.home.addMarks")}</Link>
          <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">{t("teacher.home.viewMyClasses")}</Link>
          <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">{t("teacher.home.myAssessments")}</Link>
        </div>
      </div>

      <Card className="mt-5">
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <div><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.home.examReadinessHeading")}</h2><p className="mt-1 text-xs text-neutral-500"><Bdi>{printedCount}</Bdi> {t("teacher.home.printedCountSuffix")}</p></div>
            <Link href="/teacher/exams" className="text-xs font-medium text-primary-600">{t("teacher.home.seeAll")}</Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {upcomingItems.slice(0, 6).map((item) => {
              const paper = paperBySchedule.get(item.id);
              return (
                <Link key={item.id} href={`/teacher/exams/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-800"><Bdi>{item.title}</Bdi></p><p className="truncate text-xs text-neutral-500"><Bdi>{classById.get(item.class_id)?.name ?? t("teacher.home.classFallback")}</Bdi> · <Bdi>{subjectById.get(item.subject_id)?.name ?? t("teacher.home.subjectFallback")}</Bdi> · <Bdi>{item.scheduled_date}</Bdi></p></div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <Badge variant={statusVariant(paper?.status ?? "not_started")}>{statusLabel(t, paper?.status ?? "not_started")}</Badge>
                    {paper?.print_status === "printed" && <Badge variant="success">{t("status.printed")}</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.home.todaysScheduleHeading")}</h2>{upcomingItems.length > todayItems.length && <Link href="/teacher/exams" className="text-xs font-medium text-primary-600">{t("teacher.home.viewWeek")}</Link>}</div>
        {todayItems.length === 0 ? (
          <EmptyState title={t("teacher.home.emptyTodayTitle")} description={items.length === 0 ? t("teacher.home.emptyTodayNoSubjects") : t("teacher.home.emptyTodayBreak")} />
        ) : (
          <div className="flex flex-col gap-2.5">{todayItems.map((item) => <TeacherScheduleCard key={item.id} item={item} />)}</div>
        )}
      </div>

      <Card className="mt-6">
        <CardContent>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.home.recentActivityHeading")}</h2>
          {activity.length === 0 ? (
            <EmptyState title={t("teacher.home.emptyActivityTitle")} description={t("teacher.home.emptyActivityDescription")} />
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
    </main>
  );
}
