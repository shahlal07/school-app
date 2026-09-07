"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function uploadClerkResults(scheduleItemId: string, totalMarks: number, results: Array<{ student_id: string; marks_obtained: number | null; is_absent: boolean }>) {
  const profile = await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("clerk_upload_test_results", {
    p_schedule_item_id: scheduleItemId,
    p_total_marks: totalMarks,
    p_results: results
  });
  if (error) return { error: error.message };
  revalidatePath(`/clerk/marks?id=${scheduleItemId}`);
  revalidatePath(`/teacher/exams/${scheduleItemId}`);
  revalidatePath("/clerk");
  void profile;
  return { error: null };
}
