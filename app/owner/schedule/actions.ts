"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedScheduleItem } from "@/lib/scheduling/generate-schedule";
import { getT } from "@/lib/i18n/get-translator";

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
 * preview into schedule_items. Generating/saving a test schedule is
 * day-to-day academic operations - the academic coordinator's job, not the
 * owner's (app/owner/schedule/page.tsx is now a read-only mirror of
 * app/coordinator/schedule/page.tsx, matching syllabus/papers/results/
 * interventions/calendar/exam-sets).
 */
export async function saveGeneratedSchedule(
  input: SaveScheduleInput
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const t = await getT();

  if (input.items.length === 0) {
    return { error: t("owner.schedule.nothingToSave") };
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
