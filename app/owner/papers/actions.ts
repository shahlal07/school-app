"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type ActionResult = { error: string | null };

const PAPERS_PATH = "/owner/papers";
const COORDINATOR_PAPERS_PATH = "/coordinator/papers";

/**
 * Approves a submitted paper. Callable by owner or academic_coordinator -
 * matches can_manage_academics() and the exam_papers review-field trigger
 * (enforce_exam_paper_review_fields(), widened in migration
 * 20260906124632_phase_a_extend_paper_review_trigger_to_coordinator.sql to
 * check can_manage_academics() instead of a hardcoded is_owner()).
 */
export async function approvePaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();

  const { error } = await supabase
    .from("exam_papers")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.user_id,
      review_notes: reviewNotes.trim() || null
    })
    .eq("id", paperId);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: profile.user_id,
    action: "paper_approved",
    entityType: "exam_papers",
    entityId: paperId,
    newData: { review_notes: reviewNotes.trim() || null }
  });

  revalidatePath(PAPERS_PATH);
  revalidatePath(COORDINATOR_PAPERS_PATH);
  return { error: null };
}

/**
 * Rejects a submitted paper, sending it back to `draft` so the teacher can
 * revise and resubmit it - never back to `submitted`.
 */
export async function rejectPaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();

  const trimmedNotes = reviewNotes.trim();
  if (!trimmedNotes) {
    return { error: "Please explain what needs to change before rejecting a paper." };
  }

  const { error } = await supabase
    .from("exam_papers")
    .update({
      status: "draft",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.user_id,
      review_notes: trimmedNotes
    })
    .eq("id", paperId);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: profile.user_id,
    action: "paper_rejected",
    entityType: "exam_papers",
    entityId: paperId,
    newData: { review_notes: trimmedNotes }
  });

  revalidatePath(PAPERS_PATH);
  revalidatePath(COORDINATOR_PAPERS_PATH);
  return { error: null };
}
