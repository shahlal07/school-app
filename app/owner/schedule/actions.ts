"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedScheduleItem } from "@/lib/scheduling/generate-schedule";

type ActionResult = { error: string | null; count?: number };

const SCHEDULE_PATH = "/owner/schedule";

export interface SaveScheduleInput {
  classId: string;
  subjectId: string;
  items: GeneratedScheduleItem[];
}

/**
 * Inserts a previously-generated (client-side, pure-function) schedule
 * preview into schedule_items. Owner-only at both the route-guard level
 * (defense in depth - the page is already gated by requireRole in
 * app/owner/layout.tsx) and the RLS level.
 */
export async function saveGeneratedSchedule(
  input: SaveScheduleInput
): Promise<ActionResult> {
  await requireRole("owner");

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
  return { error: null, count: count ?? rows.length };
}
