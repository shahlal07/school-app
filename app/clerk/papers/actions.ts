"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

export interface PrintOptions {
  copies: number;
  colorMode: "bw" | "color";
  duplex: boolean;
  pageCount: number | null;
  priority: "low" | "normal" | "high" | "urgent";
}

function revalidatePrinting(): void {
  revalidatePath("/clerk/papers");
  revalidatePath("/teacher");
  revalidatePath("/teacher/exams");
  revalidatePath("/teacher/alerts");
  revalidatePath("/coordinator/papers");
  revalidatePath("/coordinator/alerts");
}

export async function queueExamPaper(examPaperId: string, options: PrintOptions): Promise<Result> {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("queue_exam_paper_for_print", {
    p_exam_paper_id: examPaperId,
    p_copies: options.copies,
    p_color_mode: options.colorMode,
    p_duplex: options.duplex,
    p_page_count: options.pageCount,
    p_priority: options.priority
  });
  if (error) return { error: error.message };
  revalidatePrinting();
  return { error: null };
}

export async function markExamPaperPrinted(jobId: string): Promise<Result> {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_exam_paper_printed", { p_job_id: jobId });
  if (error) return { error: error.message };
  revalidatePrinting();
  return { error: null };
}

export async function createExamPaperReprint(jobId: string, copies: number, reason: string): Promise<Result> {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("create_exam_paper_reprint_job", {
    p_job_id: jobId,
    p_copies: copies,
    p_reason: reason.trim()
  });
  if (error) return { error: error.message };
  revalidatePrinting();
  return { error: null };
}

export async function getClerkPaperUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  await requireRole("clerk");
  if (!path) return { url: null, error: "Paper file is missing." };
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("exam-papers").createSignedUrl(path, 300);
  return error ? { url: null, error: error.message } : { url: data.signedUrl, error: null };
}
