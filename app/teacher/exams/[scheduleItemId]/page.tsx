import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TeacherExamWorkspace } from "./workspace";

export default async function TeacherExamWorkspacePage({ params }: { params: { scheduleItemId: string } }) {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const id = params.scheduleItemId;

  const { data: exam } = await supabase.from("schedule_items").select("*").eq("id", id).maybeSingle();
  if (!exam) return <main className="p-4"><h1 className="font-semibold">Exam not found</h1><Link className="text-primary-600" href="/teacher/exams">Back to exams</Link></main>;

  const { data: assignment } = await supabase.from("teacher_subjects").select("id").eq("teacher_id", profile.user_id).eq("subject_id", exam.subject_id).maybeSingle();
  if (!assignment) return <main className="p-4"><h1 className="font-semibold">You are not assigned to this exam.</h1></main>;

  const [{ data: students }, { data: paper }, { data: results }] = await Promise.all([
    supabase.from("students").select("id, roll_no, name").eq("class_id", exam.class_id).eq("is_active", true).order("roll_no"),
    supabase.from("exam_papers").select("id, status, file_path, submitted_at").eq("schedule_item_id", id).maybeSingle(),
    supabase.from("test_results").select("student_id, marks_obtained, is_absent, total_marks").eq("schedule_item_id", id)
  ]);

  return <TeacherExamWorkspace exam={exam} students={students ?? []} paper={paper} results={results ?? []} />;
}
