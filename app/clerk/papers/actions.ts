"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

export async function queueExamPaper(examPaperId: string): Promise<Result> {
  const profile = await requireRole("clerk");
  const supabase = createClient();
  const { data: paper } = await supabase.from("exam_papers").select("id, status, file_path").eq("id", examPaperId).maybeSingle();
  if (!paper || !paper.file_path) return { error: "Paper file is missing." };
  if (paper.status === "not_started" || paper.status === "draft") return { error: "Teacher has not submitted this paper yet." };
  const { error } = await supabase.from("exam_paper_print_jobs").insert({ exam_paper_id: examPaperId, queued_by: profile.user_id });
  if (error) return { error: error.code === "23505" ? "This paper is already in the print queue." : error.message };
  revalidatePath("/clerk/papers");
  revalidatePath("/teacher");
  return { error: null };
}

export async function markExamPaperPrinted(jobId: string): Promise<Result> {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_exam_paper_printed", { p_job_id: jobId });
  if (error) return { error: error.message };
  revalidatePath("/clerk/papers");
  revalidatePath("/teacher/alerts");
  revalidatePath("/coordinator/alerts");
  return { error: null };
}

export async function getClerkPaperUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  await requireRole("clerk");
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("exam-papers").createSignedUrl(path, 300);
  return error ? { url: null, error: error.message } : { url: data.signedUrl, error: null };
}
