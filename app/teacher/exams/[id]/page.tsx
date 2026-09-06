import Link from "next/link";
import { notFound } from "next/navigation";

import type { Class, Student, Subject } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { formatScheduleDate } from "@/components/examination/teacher-schedule-card";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExamPaperEditor } from "@/components/examination/exam-paper-editor";
import {
  ExamResultsRoster,
  type ExistingTestResult
} from "@/components/examination/exam-results-roster";
import type { ExamPaperStatus } from "@/app/teacher/exams/[id]/actions";

interface ExamPaperRow {
  schedule_item_id: string;
  status: ExamPaperStatus;
  content: string | null;
}

interface TestResultRow {
  student_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_absent: boolean;
  is_pass: boolean | null;
}

// Results can only be entered once the owner has moved the paper past
// approval - a teacher never controls that transition themselves (a
// non-owner is blocked by a DB trigger from setting any other status).
const RESULTS_ELIGIBLE_STATUSES: ExamPaperStatus[] = [
  "conducted",
  "results_pending",
  "completed"
];

const TEST_TYPE_LABEL: Record<string, string> = {
  topic: "Topic test",
  chapter: "Chapter test",
  revision: "Revision",
  monthly: "Monthly",
  midterm: "Midterm",
  terminal: "Terminal",
  final: "Final",
  custom: "Custom"
};

export default async function TeacherExamDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: scheduleItem, error: scheduleError } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  // RLS scopes schedule_items to what this teacher is assigned to via
  // teacher_subjects, so "no row" covers both a bad id and a row this
  // teacher isn't allowed to see - either way, 404.
  if (scheduleError || !scheduleItem) {
    notFound();
  }

  const item = scheduleItem as ScheduleItemRow;

  const [classRes, subjectRes, chapterRes, topicRes, examPaperRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", item.class_id).maybeSingle(),
    supabase.from("subjects").select("*").eq("id", item.subject_id).maybeSingle(),
    item.chapter_id
      ? supabase.from("chapters").select("name").eq("id", item.chapter_id).maybeSingle()
      : Promise.resolve({ data: null }),
    item.topic_id
      ? supabase.from("topics").select("name").eq("id", item.topic_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("exam_papers")
      .select("schedule_item_id, status, content")
      .eq("schedule_item_id", item.id)
      .maybeSingle()
  ]);

  const klass = classRes.data as Class | null;
  const subject = subjectRes.data as Subject | null;
  const chapterName = (chapterRes.data as { name: string } | null)?.name ?? null;
  const topicName = (topicRes.data as { name: string } | null)?.name ?? null;
  const examPaper = examPaperRes.data as ExamPaperRow | null;

  const paperStatus: ExamPaperStatus = examPaper?.status ?? "not_started";
  const showResults = RESULTS_ELIGIBLE_STATUSES.includes(paperStatus);

  let students: Student[] = [];
  let existingResults: ExistingTestResult[] = [];

  if (showResults) {
    const [studentsRes, resultsRes] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("class_id", item.class_id)
        .eq("is_active", true),
      supabase
        .from("test_results")
        .select("student_id, marks_obtained, total_marks, is_absent, is_pass")
        .eq("schedule_item_id", item.id)
    ]);

    students = (studentsRes.data as Student[] | null) ?? [];
    existingResults = (resultsRes.data as TestResultRow[] | null) ?? [];
  }

  const subjectAndClass = [subject?.name, klass?.name].filter(Boolean).join(" - ");

  return (
    <main className="p-4 sm:p-6">
      <Link
        href="/teacher/exams"
        className="text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        &larr; Back to exams
      </Link>

      <div className="mt-3 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900">{item.title}</h1>
        {subjectAndClass && <p className="text-sm text-neutral-500">{subjectAndClass}</p>}
        {(chapterName || topicName) && (
          <p className="text-xs text-neutral-500">
            {[chapterName, topicName].filter(Boolean).join(" - ")}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{TEST_TYPE_LABEL[item.test_type] ?? item.test_type}</Badge>
          <span className="text-xs text-neutral-500">
            {formatScheduleDate(item.scheduled_date)}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Card>
          <CardContent>
            <ExamPaperEditor
              scheduleItemId={item.id}
              status={paperStatus}
              initialContent={examPaper?.content ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Results
            </h2>
            {showResults ? (
              <ExamResultsRoster
                scheduleItemId={item.id}
                students={students}
                existingResults={existingResults}
              />
            ) : (
              <p className="text-sm text-neutral-500">
                Results can be entered once the owner marks this test as conducted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
