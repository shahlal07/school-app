import { createClient } from "@/lib/supabase/server";

/**
 * Fire-and-forget audit log write. Failures are swallowed (logged to the
 * server console) rather than surfaced to the caller - an audit-log write
 * must never block or fail the actual action it's recording. RLS allows
 * any authenticated user to insert a row where actor_id is their own
 * user id, so this works under both owner and teacher sessions.
 */
export async function logAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null
    });

    if (error) {
      console.error("audit log write failed:", error.message);
    }
  } catch (err) {
    console.error("audit log write threw:", err);
  }
}
