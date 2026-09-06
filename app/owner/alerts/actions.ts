"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type ActionResult = { error: string | null };

const ALERTS_PATH = "/owner/alerts";
const COORDINATOR_ALERTS_PATH = "/coordinator/alerts";

/**
 * Marks an open alert resolved. Callable by an owner or academic_coordinator
 * session - both have can_manage_academics(), which explicitly covers
 * alerts update/delete (RLS also enforces this at the database level - a
 * teacher's update would be rejected even if this guard were bypassed).
 * `resolved_by` is always the caller's own user id, derived server-side via
 * getCurrentProfile() inside requireAnyRole - never trust a client-supplied
 * value for this.
 */
export async function resolveAlert(alertId: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
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

  await logAudit({
    actorId: profile.user_id,
    action: "alert_resolved",
    entityType: "alerts",
    entityId: alertId
  });

  revalidatePath(ALERTS_PATH);
  revalidatePath(COORDINATOR_ALERTS_PATH);
  return { error: null };
}
