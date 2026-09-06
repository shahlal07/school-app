"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

export async function queueExamPaper(examPaperId: string): Promise<Result> {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("queue_exam_paper_for_print", { p_exam_paper_id: examPaperId });
  if (error) return { error: error.message };
  revalidatePath("/clerk/papers");
  revalidatePath("/teacher");
  revalidatePath("/coordinator/papers");
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
