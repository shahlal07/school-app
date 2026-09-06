"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

const ALERTS_PATH = "/owner/alerts";

/**
 * Marks an open alert resolved. Only callable by an owner session (RLS also
 * enforces this at the database level - a teacher's update would be rejected
 * even if this guard were bypassed). `resolved_by` is always the caller's own
 * user id, derived server-side via getCurrentProfile() inside requireRole -
 * never trust a client-supplied value for this.
 */
export async function resolveAlert(alertId: string): Promise<ActionResult> {
  const profile = await requireRole("owner");
  const supabase = createClient();

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.user_id
    })
    .eq("id", alertId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(ALERTS_PATH);
  return { error: null };
}
