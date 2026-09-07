"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markPaperHandedToClerk(scheduleItemId: string): Promise<void> {
  const profile = await requireRole("teacher");
  const { error } = await createClient().rpc("mark_paper_handed_to_clerk", { p_schedule_item_id: scheduleItemId });
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/exams/${scheduleItemId}`);
  revalidatePath("/teacher");
  revalidatePath("/clerk/papers");
  void profile;
}
