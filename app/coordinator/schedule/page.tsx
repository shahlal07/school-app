import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { ScheduleGenerator } from "@/components/examination/schedule-generator";
import type { ChapterWithTopics } from "@/lib/scheduling/generate-schedule";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { getT } from "@/lib/i18n/get-translator";

/**
 * Full read/write mirror of app/owner/schedule/page.tsx. Unlike principal
 * (who gets a read-only schedule view - see app/principal/schedule/page.tsx),
 * the academic coordinator has can_manage_academics(), which covers write on
 * schedule_items - the same operational authority as owner here - so this
 * renders the real <ScheduleGenerator/> rather than a read-only list.
 * saveGeneratedSchedule (in app/owner/schedule/actions.ts) has been widened
 * from requireRole("owner") to requireAnyRole(["owner","academic_coordinator"])
 * to match.
 */
export default async function CoordinatorSchedulePage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, subjectsRes, chaptersRes, topicsRes, scheduleItemsRes, weekendSettingRes, holidaysRes] =
    await Promise.all([
      supabase.from("classes").select("*"),
      supabase.from("subjects").select("*").order("name", { ascending: true }),
      supabase.from("chapters").select("*").order("order_index", { ascending: true }),
      supabase.from("topics").select("*").order("order_index", { ascending: true }),
      supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("school_settings").select("value").eq("key", "weekend_days").maybeSingle(),
      supabase.from("calendar_overrides").select("date").eq("day_status", "holiday")
    ]);

  // The calendar system (Phase A of the exam-set model, /coordinator/calendar)
  // is the source of truth for weekends/holidays - default this older
  // per-subject generator's day-of-week and holiday-date pickers from it so
  // a coordinator doesn't have to re-enter every holiday in two places. The
  // coordinator can still add/remove for this specific run; these are only
  // starting values.
  const weekendDaysSetting = (weekendSettingRes.data?.value as string | undefined) ?? "0,6";
  const weekendDays = new Set(
    weekendDaysSetting.split(",").map((d) => Number(d.trim())).filter((d) => !Number.isNaN(d))
  );
  const defaultTestDaysOfWeek = [0, 1, 2, 3, 4, 5, 6].filter((d) => !weekendDays.has(d));
  const defaultHolidays = ((holidaysRes.data as { date: string }[] | null) ?? []).map((h) => h.date);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));

  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as Chapter[] | null) ?? [];
  const topics = (topicsRes.data as Topic[] | null) ?? [];
  const scheduleItems = (scheduleItemsRes.data as ScheduleItemRow[] | null) ?? [];

  const subjectsByClass: Record<string, Subject[]> = {};
  for (const subject of subjects) {
    (subjectsByClass[subject.class_id] ??= []).push(subject);
  }

  const chaptersBySubject: Record<string, Chapter[]> = {};
  for (const chapter of chapters) {
    (chaptersBySubject[chapter.subject_id] ??= []).push(chapter);
  }

  const topicsByChapter: Record<string, Topic[]> = {};
  for (const topic of topics) {
    (topicsByChapter[topic.chapter_id] ??= []).push(topic);
  }

  const chaptersWithTopicsBySubject: Record<string, ChapterWithTopics[]> = {};
  for (const subject of subjects) {
    const subjectChapters = chaptersBySubject[subject.id] ?? [];
    if (subjectChapters.length === 0) continue;

    chaptersWithTopicsBySubject[subject.id] = subjectChapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterName: chapter.name,
      orderIndex: chapter.order_index,
      topics: (topicsByChapter[chapter.id] ?? []).map((topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        orderIndex: topic.order_index
      }))
    }));
  }

  const scheduleItemsBySubject: Record<string, ScheduleItemRow[]> = {};
  for (const item of scheduleItems) {
    (scheduleItemsBySubject[item.subject_id] ??= []).push(item);
  }

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("coordinator.schedule.title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("coordinator.schedule.subtitle")}
      </p>

      <div className="mt-5">
        <ScheduleGenerator
          classes={classes}
          subjectsByClass={subjectsByClass}
          chaptersWithTopicsBySubject={chaptersWithTopicsBySubject}
          scheduleItemsBySubject={scheduleItemsBySubject}
          defaultTestDaysOfWeek={defaultTestDaysOfWeek}
          defaultHolidays={defaultHolidays}
        />
      </div>
    </main>
  );
}
