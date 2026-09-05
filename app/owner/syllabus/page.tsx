import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { SyllabusManager } from "@/components/examination/syllabus-manager";
import { classOrderIndex } from "@/components/examination/constants";

export default async function SyllabusPage() {
  const supabase = createClient();

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
      <h1 className="text-xl font-semibold text-neutral-900">Syllabus manager</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage subjects, chapters, and topics for every class.
      </p>

      <div className="mt-5">
        <SyllabusManager
          classes={classes}
          subjectsByClass={subjectsByClass}
          chaptersBySubject={chaptersBySubject}
          topicsByChapter={topicsByChapter}
        />
      </div>
    </main>
  );
}
