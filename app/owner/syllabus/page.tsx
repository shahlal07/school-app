import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { SyllabusManager } from "@/components/examination/syllabus-manager";
import { classOrderIndex } from "@/components/examination/constants";
import { getT } from "@/lib/i18n/get-translator";

/**
 * Read-only mirror of app/coordinator/syllabus/page.tsx (same query
 * pattern). Editing chapters/topics/subjects is day-to-day academic
 * content work - the academic coordinator's job, not the owner's - so this
 * renders SyllabusManager with readOnly=true. Every syllabus action
 * (app/owner/syllabus/actions.ts) is guarded with
 * requireRole("academic_coordinator"), so there's no path by which an
 * owner could act on these even if a control were shown.
 */
export default async function SyllabusPage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, subjectsRes, chaptersRes, topicsRes] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*").order("name", { ascending: true }),
    supabase.from("chapters").select("*").order("order_index", { ascending: true }),
    supabase.from("topics").select("*").order("order_index", { ascending: true })
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));

  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as Chapter[] | null) ?? [];
  const topics = (topicsRes.data as Topic[] | null) ?? [];

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

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.syllabus")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("owner.syllabus.subtitle")}
      </p>

      <div className="mt-5">
        <SyllabusManager
          classes={classes}
          subjectsByClass={subjectsByClass}
          chaptersBySubject={chaptersBySubject}
          topicsByChapter={topicsByChapter}
          readOnly
        />
      </div>
    </main>
  );
}
