"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markPaperHandedToClerk(scheduleItemId: string) {
  const profile = await requireRole("teacher");
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_paper_handed_to_clerk", { p_schedule_item_id: scheduleItemId });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/exams/${scheduleItemId}`);
  revalidatePath("/teacher");
  revalidatePath("/clerk/papers");
  void profile;
  return { error: null };
}
