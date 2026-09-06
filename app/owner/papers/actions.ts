"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type ActionResult = { error: string | null };

const PAPERS_PATH = "/owner/papers";
const COORDINATOR_PAPERS_PATH = "/coordinator/papers";

export async function approvePaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();
  const { data: paper } = await supabase.from("exam_papers").select("id,teacher_id").eq("id", paperId).maybeSingle();
  if (!paper) return { error: "Paper not found." };
  const { error } = await supabase.from("exam_papers").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: profile.user_id, review_notes: reviewNotes.trim() || null }).eq("id", paperId);
  if (error) return { error: error.message };
  await supabase.from("alerts").insert({ type: "paper_approved", severity: "info", teacher_id: paper.teacher_id, recipient_id: paper.teacher_id, reference_table: "exam_papers", reference_id: paperId, message: "Your exam paper was approved and is ready for the clerk to place for printing." });
  await logAudit({ actorId: profile.user_id, action: "paper_approved", entityType: "exam_papers", entityId: paperId, newData: { review_notes: reviewNotes.trim() || null } });
  revalidatePath(PAPERS_PATH);
  revalidatePath(COORDINATOR_PAPERS_PATH);
  revalidatePath("/clerk/papers");
  return { error: null };
}

export async function rejectPaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();
  const trimmedNotes = reviewNotes.trim();
  if (!trimmedNotes) return { error: "Please explain what needs to change before rejecting a paper." };
  const { data: paper } = await supabase.from("exam_papers").select("id,teacher_id").eq("id", paperId).maybeSingle();
  if (!paper) return { error: "Paper not found." };
  const { error } = await supabase.from("exam_papers").update({ status: "draft", reviewed_at: new Date().toISOString(), reviewed_by: profile.user_id, review_notes: trimmedNotes }).eq("id", paperId);
  if (error) return { error: error.message };
  await supabase.from("alerts").insert({ type: "paper_rejected", severity: "warning", teacher_id: paper.teacher_id, recipient_id: paper.teacher_id, reference_table: "exam_papers", reference_id: paperId, message: `Your exam paper needs changes: ${trimmedNotes}` });
  await logAudit({ actorId: profile.user_id, action: "paper_rejected", entityType: "exam_papers", entityId: paperId, newData: { review_notes: trimmedNotes } });
  revalidatePath(PAPERS_PATH);
  revalidatePath(COORDINATOR_PAPERS_PATH);
  revalidatePath("/clerk/papers");
  revalidatePath("/teacher/alerts");
  return { error: null };
}
