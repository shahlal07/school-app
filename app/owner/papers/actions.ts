"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

const PAPERS_PATH = "/owner/papers";

/**
 * Approves a submitted paper. Only callable by an owner session - enforced
 * both here (defense in depth) and by a Postgres trigger that rejects any
 * attempt to move `exam_papers.status` into an owner-only state, or to touch
 * `reviewed_at`/`reviewed_by`/`review_notes`, from a non-owner session.
 */
export async function approvePaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireRole("owner");
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

  revalidatePath(PAPERS_PATH);
  return { error: null };
}

/**
 * Rejects a submitted paper, sending it back to `draft` so the teacher can
 * revise and resubmit it - never back to `submitted`.
 */
export async function rejectPaper(paperId: string, reviewNotes: string): Promise<ActionResult> {
  const profile = await requireRole("owner");
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

  revalidatePath(PAPERS_PATH);
  return { error: null };
}
