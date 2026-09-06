import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

function pakistanDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function statusLabel(status: string): string {
  return status === "approved" ? "Approved" : status === "submitted" ? "Submitted" : status === "draft" ? "Draft" : status.replaceAll("_", " ");
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (["approved", "conducted", "completed", "printed"].includes(status)) return "success";
  if (["draft", "queued", "results_pending"].includes(status)) return "warning";
  if (status === "rejected") return "danger";
  return "info";
}

export default async function TeacherHomePage() {
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

  const firstName = profile?.full_name.split(" ")[0] ?? "there";

  return (
    <main className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Teacher dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Hi, {firstName}</h1>
          <p className="mt-1 text-sm text-neutral-500">Your teaching, exam and follow-up tasks in one place.</p>
        </div>
        {homeroomLabel && <Badge variant="info">Class Teacher · {homeroomLabel}</Badge>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900">{todayItems.length}</p><p className="text-xs text-neutral-500">Today&apos;s classes</p>
        </Link>
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900">{papersAwaitingAction}</p><p className="text-xs text-neutral-500">Paper actions</p>
        </Link>
        <Link href="/teacher/exams" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900">{marksAwaitingEntry}</p><p className="text-xs text-neutral-500">Marks pending</p>
        </Link>
        <Link href="/teacher/alerts" className="rounded-xl border border-neutral-200 bg-white p-3 hover:shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900">{openAlertCount + unreadMessageCount}</p><p className="text-xs text-neutral-500">Needs attention</p>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/teacher/exams" className="rounded-xl bg-primary-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700">Open exam workspace</Link>
        <Link href="/teacher/messages" className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Open messages</Link>
      </div>

      <Card className="mt-5">
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <div><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Exam readiness · next 7 days</h2><p className="mt-1 text-xs text-neutral-500">{printedCount} paper(s) are already marked printed.</p></div>
            <Link href="/teacher/exams" className="text-xs font-medium text-primary-600">See all</Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {upcomingItems.slice(0, 6).map((item) => {
              const paper = paperBySchedule.get(item.id);
              return (
                <Link key={item.id} href={`/teacher/exams/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-800">{item.title}</p><p className="truncate text-xs text-neutral-500">{classById.get(item.class_id)?.name ?? "Class"} · {subjectById.get(item.subject_id)?.name ?? "Subject"} · {item.scheduled_date}</p></div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <Badge variant={statusVariant(paper?.status ?? "not_started")}>{statusLabel(paper?.status ?? "not_started")}</Badge>
                    {paper?.print_status === "printed" && <Badge variant="success">Printed</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Today&apos;s schedule</h2>{upcomingItems.length > todayItems.length && <Link href="/teacher/exams" className="text-xs font-medium text-primary-600">View week</Link>}</div>
        {todayItems.length === 0 ? (
          <EmptyState title="Nothing scheduled today" description={items.length === 0 ? "No subjects are assigned yet." : "Enjoy the break. Your next exam tasks are shown above."} />
        ) : (
          <div className="flex flex-col gap-2.5">{todayItems.map((item) => <TeacherScheduleCard key={item.id} item={item} />)}</div>
        )}
      </div>
    </main>
  );
}
