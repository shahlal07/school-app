import type { Chapter, Class, Student, Subject, Topic } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { PerformanceDashboard } from "@/components/examination/performance-dashboard";
import { StudentRiskPanel, type StudentRiskRow } from "@/components/examination/student-risk-panel";
import {
  makePassRateStat,
  MIN_TOPIC_SAMPLE_SIZE,
  WEAK_TOPIC_LIMIT,
  type ClassPerformance,
  type GradedResultRow,
  type SubjectPerformance,
  type WeakTopic
} from "@/components/examination/performance-types";

interface PassAcc { passed: number; total: number; }

function bumpAcc(map: Map<string, PassAcc>, key: string, didPass: boolean) {
  const acc = map.get(key) ?? { passed: 0, total: 0 };
  acc.total += 1;
  if (didPass) acc.passed += 1;
  map.set(key, acc);
}

export default async function CoordinatorPerformancePage() {
  const supabase = createClient();

  const [resultsRes, scheduleRes, classesRes, subjectsRes, chaptersRes, topicsRes, studentsRes] = await Promise.all([
    supabase.from("test_results").select("*").not("is_pass", "is", null),
    supabase.from("schedule_items").select("*"),
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("topics").select("*"),
    supabase.from("students").select("id,name,roll_no,class_id").eq("is_active", true)
  ]);

  const gradedResults = (resultsRes.data as GradedResultRow[] | null) ?? [];
  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const classes = (classesRes.data as Class[] | null) ?? [];
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as Chapter[] | null) ?? [];
  const topics = (topicsRes.data as Topic[] | null) ?? [];
  const students = (studentsRes.data as Pick<Student, "id" | "name" | "roll_no" | "class_id">[] | null) ?? [];

  if (gradedResults.length === 0) {
    return (
      <main className="p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-neutral-900">Performance</h1>
        <p className="mt-1 text-sm text-neutral-500">Aggregate pass-rate analytics across classes, subjects, topics, and students.</p>
        <div className="mt-5"><EmptyState title="No results yet" description="Performance analytics will appear here once teachers start entering test results." /></div>
      </main>
    );
  }

  const scheduleById = new Map(scheduleItems.map((item) => [item.id, item]));
  const classById = new Map(classes.map((cls) => [cls.id, cls]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  const overallAcc: PassAcc = { passed: 0, total: 0 };
  const classAcc = new Map<string, PassAcc>();
  const classSubjectAcc = new Map<string, Map<string, PassAcc>>();
  const topicAcc = new Map<string, PassAcc>();
  const studentAcc = new Map<string, { passed: number; total: number; obtained: number; marksTotal: number }>();

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
    if (scheduleItem.topic_id) bumpAcc(topicAcc, scheduleItem.topic_id, didPass);

    const student = studentAcc.get(result.student_id) ?? { passed: 0, total: 0, obtained: 0, marksTotal: 0 };
    student.total += 1;
    if (didPass) student.passed += 1;
    if (!result.is_absent && result.marks_obtained !== null) {
      student.obtained += result.marks_obtained;
      student.marksTotal += result.total_marks;
    }
    studentAcc.set(result.student_id, student);
  }

  const overall = makePassRateStat(overallAcc.passed, overallAcc.total);
  const classPerformances: ClassPerformance[] = classes
    .filter((cls) => classAcc.has(cls.id))
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name))
    .map((cls) => {
      const acc = classAcc.get(cls.id) ?? { passed: 0, total: 0 };
      const subjectMap = classSubjectAcc.get(cls.id) ?? new Map<string, PassAcc>();
      const subjectPerformances: SubjectPerformance[] = Array.from(subjectMap.entries())
        .map(([subjectId, subjectAcc]) => ({ ...makePassRateStat(subjectAcc.passed, subjectAcc.total), subjectId, subjectName: subjectById.get(subjectId)?.name ?? "Unknown subject" }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      return { ...makePassRateStat(acc.passed, acc.total), classId: cls.id, className: cls.name, subjects: subjectPerformances };
    });

  const weakTopics: WeakTopic[] = [];
  for (const [topicId, acc] of Array.from(topicAcc.entries())) {
    if (acc.total < MIN_TOPIC_SAMPLE_SIZE) continue;
    const topic = topicById.get(topicId);
    if (!topic) continue;
    const chapter = chapterById.get(topic.chapter_id);
    const subject = chapter ? subjectById.get(chapter.subject_id) : undefined;
    const cls = subject ? classById.get(subject.class_id) : undefined;
    weakTopics.push({ ...makePassRateStat(acc.passed, acc.total), topicId, topicName: topic.name, chapterName: chapter?.name ?? "Unknown chapter", subjectName: subject?.name ?? "Unknown subject", className: cls?.name ?? "Unknown class" });
  }

  const weakestTopics = weakTopics.sort((a, b) => a.passRate - b.passRate).slice(0, WEAK_TOPIC_LIMIT);
  const studentById = new Map(students.map((student) => [student.id, student]));
  const riskRows: StudentRiskRow[] = Array.from(studentAcc.entries())
    .filter(([, acc]) => acc.total >= 2)
    .map(([studentId, acc]) => {
      const student = studentById.get(studentId);
      return student ? {
        studentId,
        studentName: student.name,
        rollNo: student.roll_no,
        className: classById.get(student.class_id)?.name ?? "Unknown class",
        averagePercent: acc.marksTotal > 0 ? Math.round((acc.obtained / acc.marksTotal) * 1000) / 10 : 0,
        passRate: Math.round((acc.passed / acc.total) * 100),
        gradedCount: acc.total
      } : null;
    })
    .filter((student): student is StudentRiskRow => Boolean(student))
    .filter((student) => student.averagePercent < 60 || student.passRate < 50)
    .sort((a, b) => a.averagePercent - b.averagePercent || a.passRate - b.passRate)
    .slice(0, 10);

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Performance</h1>
      <p className="mt-1 text-sm text-neutral-500">Aggregate pass-rate analytics across classes, subjects, topics, and students.</p>
      <div className="mt-5"><PerformanceDashboard overall={overall} classPerformances={classPerformances} weakestTopics={weakestTopics} /></div>
      <div className="mt-5"><StudentRiskPanel students={riskRows} /></div>
    </main>
  );
}
