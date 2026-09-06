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

async function createVersion(
  supabase: ReturnType<typeof createClient>,
  examPaperId: string,
  teacherId: string,
  content: string | null,
  filePath: string | null,
  submissionNote: string | null
): Promise<{ error: string | null; versionNumber: number | null }> {
  const { data: latest, error: latestError } = await supabase
    .from("exam_paper_versions")
    .select("version_number")
    .eq("exam_paper_id", examPaperId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return { error: latestError.message, versionNumber: null };
  const versionNumber = (latest?.version_number ?? 0) + 1;
  const { error } = await supabase.from("exam_paper_versions").insert({
    exam_paper_id: examPaperId,
    version_number: versionNumber,
    file_path: filePath,
    content,
    created_by: teacherId,
    submission_note: submissionNote,
    status: "submitted"
  });
  return error
    ? { error: error.message, versionNumber: null }
    : { error: null, versionNumber };
}

export async function saveExamPaperDraft(scheduleItemId: string, content: string): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const trimmed = content.trim();
  if (!trimmed) return { error: "Paper content cannot be empty." };
  const { data: existing } = await supabase.from("exam_papers").select("id,status").eq("schedule_item_id", scheduleItemId).maybeSingle();
  if (existing && !["not_started", "draft"].includes(existing.status)) return { error: "Submitted papers are locked. Wait for review or use the rejection notes to revise." };
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
  const { data: existing } = await supabase.from("exam_papers").select("id,status,file_path").eq("schedule_item_id", scheduleItemId).maybeSingle();
  if (existing && !["not_started", "draft"].includes(existing.status)) return { error: "This paper has already been submitted and is locked until review." };
  let paperId = existing?.id;
  if (paperId) {
    const { error } = await supabase.from("exam_papers").update({ status: "submitted", content: trimmed, submitted_at: new Date().toISOString(), current_version: existing ? undefined : 1 }).eq("id", paperId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("exam_papers").insert({ schedule_item_id: scheduleItemId, teacher_id: profile.user_id, status: "submitted", content: trimmed, submitted_at: new Date().toISOString() }).select("id").single();
    if (error) return { error: error.message };
    paperId = data.id;
  }
  const version = await createVersion(supabase, paperId, profile.user_id, trimmed, existing?.file_path ?? null, "Teacher resubmission");
  if (version.error) return { error: version.error };
  const { error: versionUpdateError } = await supabase.from("exam_papers").update({ current_version: version.versionNumber }).eq("id", paperId);
  if (versionUpdateError) return { error: versionUpdateError.message };
  revalidatePath(examPagePath(scheduleItemId));
  revalidatePath("/clerk/papers");
  revalidatePath("/coordinator/papers");
  revalidatePath("/owner/papers");
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
  const { data: existing } = await supabase.from("exam_papers").select("id,status,file_path,current_version").eq("schedule_item_id", scheduleItemId).maybeSingle();
  if (existing && !["not_started", "draft"].includes(existing.status)) return { error: "This paper has already been submitted and is locked until review." };
  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "paper";
  const nextVersion = (existing?.current_version ?? 0) + 1;
  const path = `${profile.user_id}/${scheduleItemId}/v${nextVersion}-${Date.now()}-${safe}`;
  const { error: uploadError } = await supabase.storage.from("exam-papers").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };
  let paperId = existing?.id;
  if (paperId) {
    const { error } = await supabase.from("exam_papers").update({ status: "submitted", content: content.trim() || null, file_path: path, submitted_at: new Date().toISOString(), current_version: nextVersion }).eq("id", paperId);
    if (error) { await supabase.storage.from("exam-papers").remove([path]); return { error: error.message }; }
  } else {
    const { data, error } = await supabase.from("exam_papers").insert({ schedule_item_id: scheduleItemId, teacher_id: profile.user_id, status: "submitted", content: content.trim() || null, file_path: path, submitted_at: new Date().toISOString(), current_version: nextVersion }).select("id").single();
    if (error) { await supabase.storage.from("exam-papers").remove([path]); return { error: error.message }; }
    paperId = data.id;
  }
  const version = await createVersion(supabase, paperId, profile.user_id, content.trim() || null, path, existing ? "Revised paper after review" : "Initial submission");
  if (version.error) return { error: version.error };
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
  revalidatePath("/teacher");
  revalidatePath("/owner/results");
  revalidatePath("/owner/performance");
  revalidatePath("/coordinator");
  return { error: null };
}
