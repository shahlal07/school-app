import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { PerformanceDashboard } from "@/components/examination/performance-dashboard";
import {
  makePassRateStat,
  MIN_TOPIC_SAMPLE_SIZE,
  WEAK_TOPIC_LIMIT,
  type ClassPerformance,
  type GradedResultRow,
  type SubjectPerformance,
  type WeakTopic
} from "@/components/examination/performance-types";
import { getT } from "@/lib/i18n/get-translator";

interface PassAcc {
  passed: number;
  total: number;
}

function bumpAcc(map: Map<string, PassAcc>, key: string, didPass: boolean) {
  const acc = map.get(key) ?? { passed: 0, total: 0 };
  acc.total += 1;
  if (didPass) acc.passed += 1;
  map.set(key, acc);
}

/**
 * Direct mirror of app/owner/performance/page.tsx - <PerformanceDashboard>
 * was already fully read-only (stat cards/badges, no mutation UI), so no
 * readOnly gating was needed here; the aggregation logic is reused
 * verbatim.
 */
export default async function PrincipalPerformancePage() {
  const supabase = createClient();
  const t = await getT();

  const [resultsRes, scheduleRes, classesRes, subjectsRes, chaptersRes, topicsRes] =
    await Promise.all([
      supabase.from("test_results").select("*").not("is_pass", "is", null),
      supabase.from("schedule_items").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("chapters").select("*"),
      supabase.from("topics").select("*")
    ]);

  const gradedResults = (resultsRes.data as GradedResultRow[] | null) ?? [];

  if (gradedResults.length === 0) {
    return (
      <main className="p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t("nav.performance")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("principal.performance.subtitle")}
        </p>

        <div className="mt-5">
          <EmptyState
            title={t("principal.performance.emptyTitle")}
            description={t("principal.performance.emptyDescription")}
          />
        </div>
      </main>
    );
  }

  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const classes = (classesRes.data as Class[] | null) ?? [];
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as Chapter[] | null) ?? [];
  const topics = (topicsRes.data as Topic[] | null) ?? [];

  const scheduleById = new Map(scheduleItems.map((item) => [item.id, item]));
  const classById = new Map(classes.map((cls) => [cls.id, cls]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  const overallAcc: PassAcc = { passed: 0, total: 0 };
  const classAcc = new Map<string, PassAcc>();
  const classSubjectAcc = new Map<string, Map<string, PassAcc>>();
  const topicAcc = new Map<string, PassAcc>();

  for (const result of gradedResults) {
    const scheduleItem = scheduleById.get(result.schedule_item_id);
    if (!scheduleItem) continue;

    const didPass = result.is_pass === true;

    overallAcc.total += 1;
    if (didPass) overallAcc.passed += 1;

    bumpAcc(classAcc, scheduleItem.class_id, didPass);

    const subjectMap = classSubjectAcc.get(scheduleItem.class_id) ?? new Map<string, PassAcc>();
    bumpAcc(subjectMap, scheduleItem.subject_id, didPass);
    classSubjectAcc.set(scheduleItem.class_id, subjectMap);

    if (scheduleItem.topic_id) {
      bumpAcc(topicAcc, scheduleItem.topic_id, didPass);
    }
  }

  const overall = makePassRateStat(overallAcc.passed, overallAcc.total);

  const classPerformances: ClassPerformance[] = classes
    .filter((cls) => classAcc.has(cls.id))
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name))
    .map((cls) => {
      const acc = classAcc.get(cls.id) ?? { passed: 0, total: 0 };
      const subjectMap = classSubjectAcc.get(cls.id) ?? new Map<string, PassAcc>();

      const subjectPerformances: SubjectPerformance[] = Array.from(subjectMap.entries())
        .map(([subjectId, subjectAcc]) => ({
          ...makePassRateStat(subjectAcc.passed, subjectAcc.total),
          subjectId,
          subjectName: subjectById.get(subjectId)?.name ?? "Unknown subject"
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

      return {
        ...makePassRateStat(acc.passed, acc.total),
        classId: cls.id,
        className: cls.name,
        subjects: subjectPerformances
      };
    });

  const weakTopics: WeakTopic[] = [];
  for (const [topicId, acc] of Array.from(topicAcc.entries())) {
    if (acc.total < MIN_TOPIC_SAMPLE_SIZE) continue;

    const topic = topicById.get(topicId);
    if (!topic) continue;

    const chapter = chapterById.get(topic.chapter_id);
    const subject = chapter ? subjectById.get(chapter.subject_id) : undefined;
    const cls = subject ? classById.get(subject.class_id) : undefined;

    weakTopics.push({
      ...makePassRateStat(acc.passed, acc.total),
      topicId,
      topicName: topic.name,
      chapterName: chapter?.name ?? t("principal.common.unknownChapter"),
      subjectName: subject?.name ?? t("principal.common.unknownSubject"),
      className: cls?.name ?? t("principal.common.unknownClass")
    });
  }

  const weakestTopics = weakTopics
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, WEAK_TOPIC_LIMIT);

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.performance")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("principal.performance.subtitle")}
      </p>

      <div className="mt-5">
        <PerformanceDashboard
          overall={overall}
          classPerformances={classPerformances}
          weakestTopics={weakestTopics}
        />
      </div>
    </main>
  );
}
