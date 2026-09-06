import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TeacherScheduleCard,
  type TeacherScheduleItem
} from "@/components/examination/teacher-schedule-card";

/**
 * A teacher only ever sees their own assigned schedule_items here - RLS on
 * schedule_items (and the classes/subjects/chapters/topics it joins against)
 * already scopes every row to what that teacher is assigned to via
 * teacher_subjects, so a plain unfiltered select is correct and complete.
 */
export default async function TeacherExamsPage() {
  const t = await getT();
  const supabase = createClient();

  const [scheduleRes, classesRes, subjectsRes, chaptersRes, topicsRes] = await Promise.all([
    supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true }),
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("topics").select("*")
  ]);

  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const classes = (classesRes.data as Class[] | null) ?? [];
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as Chapter[] | null) ?? [];
  const topics = (topicsRes.data as Topic[] | null) ?? [];

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const items: TeacherScheduleItem[] = scheduleItems.map((item) => ({
    ...item,
    className: classById.get(item.class_id)?.name ?? null,
    subjectName: subjectById.get(item.subject_id)?.name ?? null,
    chapterName: item.chapter_id ? chapterById.get(item.chapter_id)?.name ?? null : null,
    topicName: item.topic_id ? topicById.get(item.topic_id)?.name ?? null : null
  }));

  if (items.length === 0) {
    return (
      <main className="p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("nav.exams")}</h1>
        <div className="mt-4">
          <EmptyState
            title={t("teacher.exams.emptyTitle")}
            description={t("teacher.exams.emptyDescription")}
          />
        </div>
      </main>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAheadDate = new Date();
  weekAheadDate.setDate(weekAheadDate.getDate() + 7);
  const weekAheadStr = weekAheadDate.toISOString().slice(0, 10);

  const past = items.filter((item) => item.scheduled_date < todayStr);
  const today = items.filter((item) => item.scheduled_date === todayStr);
  const thisWeek = items.filter(
    (item) => item.scheduled_date > todayStr && item.scheduled_date <= weekAheadStr
  );
  const upcoming = items.filter((item) => item.scheduled_date > weekAheadStr);

  const sections: { heading: string; items: TeacherScheduleItem[] }[] = [
    { heading: t("teacher.exams.sectionToday"), items: today },
    { heading: t("teacher.exams.sectionThisWeek"), items: thisWeek },
    { heading: t("teacher.exams.sectionUpcoming"), items: upcoming },
    { heading: t("teacher.exams.sectionPast"), items: past }
  ].filter((section) => section.items.length > 0);

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.exams")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("teacher.exams.subtitle")}</p>

      <div className="mt-5 flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {section.heading}
            </h2>
            <div className="flex flex-col gap-2.5">
              {section.items.map((item) => (
                <TeacherScheduleCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
