import Link from "next/link";

import type { Profile } from "@/types/database";
import type { Class, Subject } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface ScheduleItemRow {
  id: string;
  class_id: string;
  subject_id: string;
  topic_id: string | null;
  teacher_id: string | null;
  status: string;
  scheduled_date: string;
}

interface ExamPaperRow {
  schedule_item_id: string;
  status: string;
}

interface TeacherSubjectRow {
  teacher_id: string;
  subject_id: string;
}

interface ChapterRow {
  id: string;
  subject_id: string;
}

interface TopicRow {
  id: string;
  chapter_id: string;
}

interface TestResultRow {
  schedule_item_id: string;
  is_pass: boolean | null;
  is_absent: boolean;
}

const MIN_TOPIC_SAMPLE_SIZE = 3;
const WEAK_TOPIC_LIMIT = 5;

/**
 * Academic Coordinator's flagship dashboard - the one genuinely new page in
 * this phase. Every section below is backed by a real query against the
 * live schema (no placeholder/mock data):
 *
 *  1. Teacher activity: papers submitted vs. scheduled per teacher - same
 *     aggregation shape as app/owner/reports/page.tsx's teacherCompliance.
 *  2. Syllabus progress per class/subject: topics that have at least one
 *     "completed" schedule_item vs. total topics for that subject - built
 *     from the same chapters/topics/schedule_items relationships used by
 *     app/owner/performance/page.tsx.
 *  3. Exam control counts: upcoming exams, schedule items with no exam
 *     paper filed yet, and graded-but-unresolved test_results rows - reusing
 *     the queue-bucketing logic from app/owner/papers/page.tsx and the
 *     is_pass/is_absent semantics from app/owner/results/page.tsx.
 *  4. At-risk students: weak-topic pass-rate aggregation, same pattern (and
 *     MIN_TOPIC_SAMPLE_SIZE threshold) as app/owner/performance/page.tsx.
 *     This app is genuinely new with little seeded test_results data, so an
 *     honest empty state (via <EmptyState/>) is expected and correct here,
 *     not a bug.
 */
export default async function CoordinatorDashboardPage() {
  const supabase = createClient();

  const [
    classesRes,
    subjectsRes,
    chaptersRes,
    topicsRes,
    scheduleItemsRes,
    examPapersRes,
    teachersRes,
    teacherSubjectsRes,
    testResultsRes
  ] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("id, subject_id"),
    supabase.from("topics").select("id, chapter_id"),
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, topic_id, teacher_id, status, scheduled_date"),
    supabase.from("exam_papers").select("schedule_item_id, status"),
    supabase.from("profiles").select("*").eq("role", "teacher"),
    supabase.from("teacher_subjects").select("teacher_id, subject_id"),
    supabase.from("test_results").select("schedule_item_id, is_pass, is_absent")
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as ChapterRow[] | null) ?? [];
  const topics = (topicsRes.data as TopicRow[] | null) ?? [];
  const scheduleItems = (scheduleItemsRes.data as ScheduleItemRow[] | null) ?? [];
  const examPapers = (examPapersRes.data as ExamPaperRow[] | null) ?? [];
  const teachers = (teachersRes.data as Profile[] | null) ?? [];
  const teacherSubjects = (teacherSubjectsRes.data as TeacherSubjectRow[] | null) ?? [];
  const testResults = (testResultsRes.data as TestResultRow[] | null) ?? [];

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const paperStatusByScheduleItem = new Map(examPapers.map((p) => [p.schedule_item_id, p.status]));

  // ---- 1. Teacher activity: papers submitted vs. scheduled, per teacher ----
  const teacherActivity = teachers.map((teacher) => {
    const assignedSubjectIds = new Set(
      teacherSubjects.filter((ts) => ts.teacher_id === teacher.user_id).map((ts) => ts.subject_id)
    );
    const relevantItems = scheduleItems.filter(
      (item) => assignedSubjectIds.has(item.subject_id) && item.status !== "cancelled"
    );
    const papersSubmitted = relevantItems.filter((item) => {
      const status = paperStatusByScheduleItem.get(item.id);
      return status && status !== "not_started" && status !== "draft";
    }).length;
    return {
      teacher,
      scheduled: relevantItems.length,
      papersSubmitted
    };
  });

  // ---- 2. Syllabus progress per class/subject ----
  // "Covered" = the topic has at least one schedule_item whose test has
  // actually been conducted (status = 'completed').
  const topicsBySubject = new Map<string, TopicRow[]>();
  for (const chapter of chapters) {
    const chapterTopics = topics.filter((t) => t.chapter_id === chapter.id);
    const existing = topicsBySubject.get(chapter.subject_id) ?? [];
    topicsBySubject.set(chapter.subject_id, existing.concat(chapterTopics));
  }

  const coveredTopicIds = new Set(
    scheduleItems
      .filter((item) => item.status === "completed" && item.topic_id)
      .map((item) => item.topic_id as string)
  );

  const syllabusProgressByClass = classes
    .map((klass) => {
      const classSubjects = subjects.filter((s) => s.class_id === klass.id);
      const subjectProgress = classSubjects.map((subject) => {
        const subjectTopics = topicsBySubject.get(subject.id) ?? [];
        const covered = subjectTopics.filter((t) => coveredTopicIds.has(t.id)).length;
        return { subject, total: subjectTopics.length, covered };
      });
      return { klass, subjectProgress: subjectProgress.filter((sp) => sp.total > 0) };
    })
    .filter((entry) => entry.subjectProgress.length > 0);

  // ---- 3. Exam control counts ----
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingExams = scheduleItems.filter(
    (item) =>
      (item.status === "upcoming" || item.status === "scheduled") &&
      item.scheduled_date >= todayIso
  ).length;

  const missingPapers = scheduleItems.filter((item) => {
    if (item.status === "cancelled") return false;
    const status = paperStatusByScheduleItem.get(item.id);
    return !status || status === "not_started";
  }).length;

  const unmarkedResults = testResults.filter(
    (result) => result.is_pass === null && !result.is_absent
  ).length;

  // ---- 4. At-risk students: weak-topic pass rate ----
  interface PassAcc {
    passed: number;
    total: number;
  }
  const topicAcc = new Map<string, PassAcc>();
  const gradedResults = testResults.filter((r) => r.is_pass !== null);
  const scheduleItemById = new Map(scheduleItems.map((item) => [item.id, item]));

  for (const result of gradedResults) {
    const scheduleItem = scheduleItemById.get(result.schedule_item_id);
    if (!scheduleItem?.topic_id) continue;
    const acc = topicAcc.get(scheduleItem.topic_id) ?? { passed: 0, total: 0 };
    acc.total += 1;
    if (result.is_pass) acc.passed += 1;
    topicAcc.set(scheduleItem.topic_id, acc);
  }

  const weakTopics = Array.from(topicAcc.entries())
    .filter(([, acc]) => acc.total >= MIN_TOPIC_SAMPLE_SIZE)
    .map(([topicId, acc]) => {
      const chapter = chapterById.get(
        (topics.find((t) => t.id === topicId) as TopicRow | undefined)?.chapter_id ?? ""
      );
      const subject = chapter ? subjectById.get(chapter.subject_id) : undefined;
      const cls = subject ? classById.get(subject.class_id) : undefined;
      return {
        topicId,
        passRate: acc.total > 0 ? Math.round((acc.passed / acc.total) * 100) : 0,
        total: acc.total,
        subjectName: subject?.name ?? "Unknown subject",
        className: cls?.name ?? "Unknown class"
      };
    })
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, WEAK_TOPIC_LIMIT);

  const hasAnyGradedResults = gradedResults.length > 0;

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Academic Coordinator console</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Exam operations mission control - schedules, papers, and results across every class.
        </p>
      </div>

      {/* Exam control counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Upcoming exams
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{upcomingExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Missing papers
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{missingPapers}</p>
            <Link href="/coordinator/papers" className="mt-1 inline-block text-xs text-primary-600 hover:underline">
              Review queue &rarr;
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Unmarked results
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{unmarkedResults}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Teacher activity summary */}
        <Card>
          <CardHeader>
            <CardTitle>Teacher activity</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-sm text-neutral-500">No teachers yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {teacherActivity.map(({ teacher, scheduled, papersSubmitted }) => (
                  <li
                    key={teacher.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-neutral-800">{teacher.full_name}</span>
                    <Badge
                      variant={
                        scheduled === 0 ? "neutral" : papersSubmitted === scheduled ? "success" : "warning"
                      }
                    >
                      {scheduled === 0 ? "No tests yet" : `${papersSubmitted} / ${scheduled} papers`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Syllabus progress per class/subject */}
        <Card>
          <CardHeader>
            <CardTitle>Syllabus progress</CardTitle>
          </CardHeader>
          <CardContent>
            {syllabusProgressByClass.length === 0 ? (
              <EmptyState
                title="Nothing to track yet"
                description="Once chapters/topics exist and tests are conducted, coverage will show up here."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {syllabusProgressByClass.map(({ klass, subjectProgress }) => (
                  <li key={klass.id}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {klass.name}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {subjectProgress.map(({ subject, total, covered }) => (
                        <div
                          key={subject.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-1.5 text-sm"
                        >
                          <span className="truncate text-neutral-700">{subject.name}</span>
                          <Badge variant={covered === total && total > 0 ? "success" : "neutral"}>
                            {covered} / {total} topics
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-risk students (weak-topic pass rate) */}
      <Card>
        <CardHeader>
          <CardTitle>At-risk topics</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyGradedResults ? (
            <EmptyState
              title="No graded results yet"
              description="At-risk topics will appear here once teachers start entering test results and enough students have been graded on a topic."
            />
          ) : weakTopics.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No topic currently has a low enough pass rate (or enough graded attempts) to flag.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {weakTopics.map((wt) => (
                <li
                  key={wt.topicId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-800">
                      {wt.subjectName} &middot; {wt.className}
                    </p>
                    <p className="text-xs text-neutral-500">{wt.total} graded attempts</p>
                  </div>
                  <Badge variant={wt.passRate < 50 ? "danger" : "warning"}>{wt.passRate}% pass</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
