"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedScheduleItem } from "@/lib/scheduling/generate-schedule";

type ActionResult = { error: string | null; count?: number };

const SCHEDULE_PATH = "/owner/schedule";
const COORDINATOR_SCHEDULE_PATH = "/coordinator/schedule";

export interface SaveScheduleInput {
  classId: string;
  subjectId: string;
  items: GeneratedScheduleItem[];
}

/**
 * Inserts a previously-generated (client-side, pure-function) schedule
 * preview into schedule_items. Callable by owner or academic_coordinator -
 * both have can_manage_academics(), which covers schedule_items write at the
 * RLS level. This guard is defense in depth: the calling page is already
 * gated by requireRole("owner") in app/owner/layout.tsx or by
 * requireAnyRole(["owner","academic_coordinator"]) in
 * app/coordinator/layout.tsx, depending on which segment renders it.
 */
export async function saveGeneratedSchedule(
  input: SaveScheduleInput
): Promise<ActionResult> {
  await requireAnyRole(["owner", "academic_coordinator"]);

  if (input.items.length === 0) {
    return { error: "Nothing to save - generate a preview first." };
  }

  const supabase = createClient();

  const rows = input.items.map((item) => ({
    class_id: input.classId,
    subject_id: input.subjectId,
    chapter_id: item.chapterId,
    topic_id: item.topicId,
    test_type: item.testType,
    status: "upcoming" as const,
    scheduled_date: item.date,
    title: item.title
  }));

  const { error, count } = await supabase
    .from("schedule_items")
    .insert(rows, { count: "exact" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SCHEDULE_PATH);
  revalidatePath(COORDINATOR_SCHEDULE_PATH);
  return { error: null, count: count ?? rows.length };
}
