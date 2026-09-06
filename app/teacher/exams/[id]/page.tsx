import Link from "next/link";
import { notFound } from "next/navigation";
import type { Class, Student, Subject } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { formatScheduleDate } from "@/components/examination/teacher-schedule-card";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExamPaperEditor } from "@/components/examination/exam-paper-editor";
import { ExamResultsRoster, type ExistingTestResult } from "@/components/examination/exam-results-roster";
import type { ExamPaperStatus } from "./actions";

interface ExamPaperRow { schedule_item_id: string; status: ExamPaperStatus; content: string | null; file_path: string | null; }
interface TestResultRow { student_id: string; marks_obtained: number | null; total_marks: number; is_absent: boolean; is_pass: boolean | null; }
const TEST_TYPE_LABEL: Record<string, string> = { topic: "Topic test", chapter: "Chapter test", revision: "Revision", monthly: "Monthly", midterm: "Midterm", terminal: "Terminal", final: "Final", custom: "Custom" };

export default async function TeacherExamDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: scheduleItem } = await supabase.from("schedule_items").select("*").eq("id", params.id).maybeSingle();
  if (!scheduleItem) notFound();
  const item = scheduleItem as ScheduleItemRow;
  const [classRes, subjectRes, chapterRes, topicRes, examPaperRes, studentsRes, resultsRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", item.class_id).maybeSingle(),
    supabase.from("subjects").select("*").eq("id", item.subject_id).maybeSingle(),
    item.chapter_id ? supabase.from("chapters").select("name").eq("id", item.chapter_id).maybeSingle() : Promise.resolve({ data: null }),
    item.topic_id ? supabase.from("topics").select("name").eq("id", item.topic_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("exam_papers").select("schedule_item_id,status,content,file_path").eq("schedule_item_id", item.id).maybeSingle(),
    supabase.from("students").select("*").eq("class_id", item.class_id).eq("is_active", true),
    supabase.from("test_results").select("student_id,marks_obtained,total_marks,is_absent,is_pass").eq("schedule_item_id", item.id)
  ]);
  const klass = classRes.data as Class | null;
  const subject = subjectRes.data as Subject | null;
  const chapterName = (chapterRes.data as { name: string } | null)?.name ?? null;
  const topicName = (topicRes.data as { name: string } | null)?.name ?? null;
  const examPaper = examPaperRes.data as ExamPaperRow | null;
  const students = (studentsRes.data as Student[] | null) ?? [];
  const existingResults = (resultsRes.data as TestResultRow[] | null) ?? [];
  const paperStatus: ExamPaperStatus = examPaper?.status ?? "not_started";
  const subjectAndClass = [subject?.name, klass?.name].filter(Boolean).join(" - ");

  return <main className="p-4 sm:p-6">
    <Link href="/teacher/exams" className="text-sm font-medium text-primary-600">&larr; Back to exams</Link>
    <div className="mt-3 flex flex-col gap-1"><h1 className="text-xl font-semibold text-neutral-900">{item.title}</h1>{subjectAndClass && <p className="text-sm text-neutral-500">{subjectAndClass}</p>}{(chapterName || topicName) && <p className="text-xs text-neutral-500">{[chapterName, topicName].filter(Boolean).join(" - ")}</p>}<div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant="neutral">{TEST_TYPE_LABEL[item.test_type] ?? item.test_type}</Badge><span className="text-xs text-neutral-500">{formatScheduleDate(item.scheduled_date)}</span></div></div>
    <div className="mt-5 flex flex-col gap-4">
      <Card><CardContent><ExamPaperEditor scheduleItemId={item.id} status={paperStatus} initialContent={examPaper?.content ?? ""} initialFilePath={examPaper?.file_path ?? null} /></CardContent></Card>
      <Card><CardContent><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Results</h2><ExamResultsRoster scheduleItemId={item.id} students={students} existingResults={existingResults} /></CardContent></Card>
    </div>
  </main>;
}
