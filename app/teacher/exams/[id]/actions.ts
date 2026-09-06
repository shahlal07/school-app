"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export type ExamPaperStatus =
  | "not_started" | "draft" | "submitted" | "under_review"
  | "approved" | "conducted" | "results_pending" | "completed";

export interface TestResultInput { studentId: string; marksObtained: number | null; isAbsent: boolean; }

function examPagePath(scheduleItemId: string): string { return `/teacher/exams/${scheduleItemId}`; }

export async function saveExamPaperDraft(scheduleItemId: string, content: string): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const trimmed = content.trim();
  if (!trimmed) return { error: "Paper content cannot be empty." };
  const { error } = await supabase.from("exam_papers").upsert({ schedule_item_id: scheduleItemId, teacher_id: profile.user_id, status: "draft", content: trimmed }, { onConflict: "schedule_item_id" });
  if (error) return { error: error.message };
  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}

export async function submitExamPaper(scheduleItemId: string, content: string): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const trimmed = content.trim();
  if (!trimmed) return { error: "Paper content cannot be empty before submitting." };
  const { error } = await supabase.from("exam_papers").upsert({ schedule_item_id: scheduleItemId, teacher_id: profile.user_id, status: "submitted", content: trimmed, submitted_at: new Date().toISOString() }, { onConflict: "schedule_item_id" });
  if (error) return { error: error.message };
  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}

export async function submitExamPaperFile(scheduleItemId: string, content: string, formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or Word document." };
  if (file.size > 15 * 1024 * 1024) return { error: "Paper must be 15 MB or smaller." };
  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type)) return { error: "Upload a PDF or Word document." };
  const { data: schedule } = await supabase.from("schedule_items").select("id,subject_id").eq("id", scheduleItemId).maybeSingle();
  if (!schedule) return { error: "Exam not found." };
  const { data: assignment } = await supabase.from("teacher_subjects").select("id").eq("teacher_id", profile.user_id).eq("subject_id", schedule.subject_id).maybeSingle();
  if (!assignment) return { error: "You are not assigned to this exam." };
  const { data: existing } = await supabase.from("exam_papers").select("id,status,file_path").eq("schedule_item_id", scheduleItemId).maybeSingle();
  if (existing && !["not_started", "draft", "submitted"].includes(existing.status)) return { error: "This paper is already beyond the teacher submission stage." };
  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "paper";
  const path = `${profile.user_id}/${scheduleItemId}/${Date.now()}-${safe}`;
  const { error: uploadError } = await supabase.storage.from("exam-papers").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };
  const payload = { schedule_item_id: scheduleItemId, teacher_id: profile.user_id, status: "submitted", content: content.trim() || null, file_path: path, submitted_at: new Date().toISOString() };
  const { error } = existing ? await supabase.from("exam_papers").update(payload).eq("id", existing.id) : await supabase.from("exam_papers").insert(payload);
  if (error) { await supabase.storage.from("exam-papers").remove([path]); return { error: error.message }; }
  revalidatePath(examPagePath(scheduleItemId));
  revalidatePath("/clerk/papers");
  revalidatePath("/coordinator/papers");
  revalidatePath("/owner/papers");
  return { error: null };
}

export async function saveTestResults(scheduleItemId: string, totalMarks: number, results: TestResultInput[]): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return { error: "Total marks must be a positive number." };
  if (!results.length) return { error: null };
  const rows = results.map((result) => ({ schedule_item_id: scheduleItemId, student_id: result.studentId, total_marks: totalMarks, is_absent: result.isAbsent, marks_obtained: result.isAbsent ? null : result.marksObtained, entered_by: profile.user_id, entered_at: new Date().toISOString() }));
  const invalid = rows.find((row) => row.marks_obtained !== null && (!Number.isFinite(row.marks_obtained) || row.marks_obtained < 0 || row.marks_obtained > totalMarks));
  if (invalid) return { error: `Marks must be between 0 and ${totalMarks}.` };
  const { error } = await supabase.from("test_results").upsert(rows, { onConflict: "schedule_item_id,student_id" });
  if (error) return { error: error.message };
  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}
