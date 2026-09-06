"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

function safeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "paper";
}

export async function submitExamPaper(scheduleItemId: string, formData: FormData): Promise<Result> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("schedule_items")
    .select("id, title, subject_id")
    .eq("id", scheduleItemId)
    .maybeSingle();
  if (scheduleError || !schedule) return { error: "Exam could not be found." };

  const { data: assignment } = await supabase
    .from("teacher_subjects")
    .select("id")
    .eq("teacher_id", profile.user_id)
    .eq("subject_id", schedule.subject_id)
    .maybeSingle();
  if (!assignment) return { error: "You are not assigned to this exam." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or document to upload." };
  if (file.size > 15 * 1024 * 1024) return { error: "Paper must be 15 MB or smaller." };
  if (!file.type.includes("pdf") && !file.type.includes("word") && !file.type.includes("officedocument")) {
    return { error: "Upload a PDF or Word document." };
  }

  const path = `${profile.user_id}/${scheduleItemId}/${Date.now()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("exam-papers").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (uploadError) return { error: uploadError.message };

  const { data: existing } = await supabase
    .from("exam_papers")
    .select("id, status, file_path")
    .eq("schedule_item_id", scheduleItemId)
    .maybeSingle();

  if (existing && !["not_started", "draft", "submitted"].includes(existing.status)) {
    await supabase.storage.from("exam-papers").remove([path]);
    return { error: "This paper is already beyond the teacher submission stage." };
  }

  const payload = {
    schedule_item_id: scheduleItemId,
    teacher_id: profile.user_id,
    status: "submitted",
    file_path: path,
    submitted_at: new Date().toISOString()
  };

  const { error: paperError } = existing
    ? await supabase.from("exam_papers").update(payload).eq("id", existing.id)
    : await supabase.from("exam_papers").insert(payload);

  if (paperError) {
    await supabase.storage.from("exam-papers").remove([path]);
    return { error: paperError.message };
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/exams");
  revalidatePath("/owner/papers");
  revalidatePath("/coordinator/papers");
  revalidatePath("/clerk/papers");
  return { error: null };
}

export async function saveExamResults(scheduleItemId: string, rows: { studentId: string; marks: string; absent: boolean }[]): Promise<Result> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const { data: schedule } = await supabase.from("schedule_items").select("id, class_id, subject_id").eq("id", scheduleItemId).maybeSingle();
  if (!schedule) return { error: "Exam could not be found." };
  const { data: assignment } = await supabase.from("teacher_subjects").select("id").eq("teacher_id", profile.user_id).eq("subject_id", schedule.subject_id).maybeSingle();
  if (!assignment) return { error: "You are not assigned to this exam." };

  const { data: students } = await supabase.from("students").select("id").eq("class_id", schedule.class_id).eq("is_active", true);
  const allowed = new Set((students ?? []).map((s) => s.id));
  const payload = rows.filter((r) => allowed.has(r.studentId)).map((r) => ({
    schedule_item_id: scheduleItemId,
    student_id: r.studentId,
    marks_obtained: r.absent ? null : (r.marks.trim() === "" ? null : Number(r.marks)),
    total_marks: 100,
    is_absent: r.absent,
    entered_by: profile.user_id,
    entered_at: new Date().toISOString()
  }));
  if (payload.some((r) => r.marks_obtained !== null && (!Number.isFinite(r.marks_obtained) || r.marks_obtained < 0 || r.marks_obtained > 100))) {
    return { error: "Marks must be between 0 and 100." };
  }
  const { error } = await supabase.from("test_results").upsert(payload, { onConflict: "schedule_item_id,student_id" });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/exams/${scheduleItemId}`);
  revalidatePath("/owner/results");
  revalidatePath("/principal/results");
  revalidatePath("/coordinator/results");
  return { error: null };
}

export async function getPaperDownloadUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("exam-papers").createSignedUrl(path, 300);
  if (error) return { url: null, error: error.message };
  if (!path.startsWith(`${profile.user_id}/`)) return { url: null, error: "Not allowed." };
  return { url: data.signedUrl, error: null };
}
