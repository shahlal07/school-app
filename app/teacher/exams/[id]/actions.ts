"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export type ExamPaperStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "conducted"
  | "results_pending"
  | "completed";

export interface TestResultInput {
  studentId: string;
  marksObtained: number | null;
  isAbsent: boolean;
}

function examPagePath(scheduleItemId: string): string {
  return `/teacher/exams/${scheduleItemId}`;
}

/**
 * Both save-draft and submit upsert on `schedule_item_id` (unique on
 * exam_papers) so a teacher's very first visit - where no exam_papers row
 * exists at all yet - creates one rather than requiring a separate
 * "create" step. `teacher_id` on exam_papers references profiles(user_id),
 * i.e. the auth user id, not the profiles row id - requireRole returns the
 * profile row, so we read `.user_id` off it, never `.id`.
 */
export async function saveExamPaperDraft(
  scheduleItemId: string,
  content: string
): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Paper content cannot be empty." };
  }

  const { error } = await supabase.from("exam_papers").upsert(
    {
      schedule_item_id: scheduleItemId,
      teacher_id: profile.user_id,
      status: "draft",
      content: trimmed
    },
    { onConflict: "schedule_item_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}

export async function submitExamPaper(
  scheduleItemId: string,
  content: string
): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Paper content cannot be empty before submitting." };
  }

  const { error } = await supabase.from("exam_papers").upsert(
    {
      schedule_item_id: scheduleItemId,
      teacher_id: profile.user_id,
      status: "submitted",
      content: trimmed,
      submitted_at: new Date().toISOString()
    },
    { onConflict: "schedule_item_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}

/**
 * Upserts the whole roster in one call. `is_pass` is never set here - the
 * `compute_test_result_pass_status` trigger derives it from
 * marks_obtained/total_marks against the configurable pass-percentage
 * setting, and also clears marks_obtained to null when is_absent is true,
 * so an absent row's marksObtained is dropped before it ever reaches the
 * database to avoid fighting that trigger. `entered_by` references
 * profiles(user_id), same as teacher_id elsewhere in this schema.
 */
export async function saveTestResults(
  scheduleItemId: string,
  totalMarks: number,
  results: TestResultInput[]
): Promise<ActionResult> {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return { error: "Total marks must be a positive number." };
  }

  if (results.length === 0) {
    return { error: null };
  }

  const enteredAt = new Date().toISOString();

  const rows = results.map((result) => ({
    schedule_item_id: scheduleItemId,
    student_id: result.studentId,
    total_marks: totalMarks,
    is_absent: result.isAbsent,
    marks_obtained: result.isAbsent ? null : result.marksObtained,
    entered_by: profile.user_id,
    entered_at: enteredAt
  }));

  const { error } = await supabase
    .from("test_results")
    .upsert(rows, { onConflict: "schedule_item_id,student_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(examPagePath(scheduleItemId));
  return { error: null };
}
