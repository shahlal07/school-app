import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Chapter, Class, ClassTeacher, Section, Subject, Topic } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import {
  TeacherScheduleCard,
  type TeacherScheduleItem
} from "@/components/examination/teacher-schedule-card";

export default async function TeacherHomePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const [
    scheduleRes,
    classesRes,
    sectionsRes,
    subjectsRes,
    chaptersRes,
    topicsRes,
    alertsRes,
    messagesRes,
    classTeacherRes
  ] = await Promise.all([
    supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("topics").select("*"),
    supabase.from("alerts").select("id").eq("status", "open"),
    profile
      ? supabase
          .from("messages")
          .select("id")
          .eq("recipient_id", profile.user_id)
          .is("read_at", null)
      : Promise.resolve({ data: [] }),
    profile
      ? supabase.from("class_teachers").select("*").eq("teacher_id", profile.user_id).maybeSingle()
      : Promise.resolve({ data: null })
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
    ? (() => {
        const klass = classById.get(classTeacherRow.class_id);
        const section = sectionById.get(classTeacherRow.section_id);
        return klass && section ? `${klass.name}-${section.name}` : null;
      })()
    : null;

  const items: TeacherScheduleItem[] = scheduleItems.map((item) => ({
    ...item,
    className: classById.get(item.class_id)?.name ?? null,
    subjectName: subjectById.get(item.subject_id)?.name ?? null,
    chapterName: item.chapter_id ? chapterById.get(item.chapter_id)?.name ?? null : null,
    topicName: item.topic_id ? topicById.get(item.topic_id)?.name ?? null : null
  }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAheadDate = new Date();
  weekAheadDate.setDate(weekAheadDate.getDate() + 7);
  const weekAheadStr = weekAheadDate.toISOString().slice(0, 10);

  const todayItems = items.filter((item) => item.scheduled_date === todayStr);
  const thisWeekCount = items.filter(
    (item) => item.scheduled_date > todayStr && item.scheduled_date <= weekAheadStr
  ).length;

  const firstName = profile?.full_name.split(" ")[0] ?? "there";

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Hi, {firstName}</h1>
      <p className="mt-1 text-sm text-neutral-500">Here&apos;s what needs your attention today.</p>
      {homeroomLabel && (
        <Badge variant="info" className="mt-2">
          Class Teacher of {homeroomLabel}
        </Badge>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          href="/teacher/exams"
          className="rounded-xl border border-neutral-200 bg-white p-3 text-center hover:shadow-sm"
        >
          <p className="text-lg font-semibold text-neutral-900">{todayItems.length}</p>
          <p className="text-xs text-neutral-500">Today</p>
        </Link>
        <Link
          href="/teacher/alerts"
          className="rounded-xl border border-neutral-200 bg-white p-3 text-center hover:shadow-sm"
        >
          <p className="text-lg font-semibold text-neutral-900">{openAlertCount}</p>
          <p className="text-xs text-neutral-500">Alerts</p>
        </Link>
        <Link
          href="/teacher/messages"
          className="rounded-xl border border-neutral-200 bg-white p-3 text-center hover:shadow-sm"
        >
          <p className="text-lg font-semibold text-neutral-900">{unreadMessageCount}</p>
          <p className="text-xs text-neutral-500">Messages</p>
        </Link>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Today&apos;s exams
          </h2>
          {thisWeekCount > 0 && (
            <Link href="/teacher/exams" className="text-xs font-medium text-primary-600">
              {thisWeekCount} more this week
            </Link>
          )}
        </div>

        {todayItems.length === 0 ? (
          <EmptyState
            title="Nothing scheduled today"
            description={
              items.length === 0
                ? "No subjects assigned yet - contact the school owner."
                : "Enjoy the break. Check the Exams tab for what's coming up."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {todayItems.map((item) => (
              <TeacherScheduleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
