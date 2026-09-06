"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

/**
 * Triggers the generate_exam_set(...) RPC for one class. Strict
 * requireRole("academic_coordinator") (not requireAnyRole) so the owner
 * preview of /coordinator/exam-sets can never reach this server-side, even
 * if the UI gate were somehow bypassed - mirrors
 * app/coordinator/calendar/actions.ts's createCalendarOverride.
 *
 * The RPC itself is SECURITY DEFINER and re-checks the caller's role/collision
 * state internally, raising clear Postgres exception text (e.g. "This class
 * already has an exam set in progress...") - that message is surfaced to the
 * caller verbatim via error.message, which is exactly what should be shown
 * to the coordinator.
 */
export async function generateExamSet(
  classId: string,
  startDate: string | null
): Promise<Result> {
  await requireRole("academic_coordinator");
  const supabase = createClient();

  const { error } = await supabase.rpc("generate_exam_set", {
    p_class_id: classId,
    p_start_date: startDate
  });

  if (error) return { error: error.message };

  revalidatePath("/coordinator/exam-sets");
  revalidatePath("/coordinator/schedule");
  return { error: null };
}
