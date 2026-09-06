"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getT } from "@/lib/i18n/get-translator";

type ActionResult = { error: string | null };

const SETTINGS_PATH = "/owner/settings";

export async function updatePassPercentage(value: number): Promise<ActionResult> {
  const profile = await requireRole("owner");
  const t = await getT();

  if (!Number.isFinite(value) || value < 1 || value > 100) {
    return { error: t("owner.settings.invalidPassPercentage") };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("school_settings")
    .select("id, value")
    .eq("key", "pass_percentage")
    .maybeSingle();

  const { error } = await supabase
    .from("school_settings")
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq("key", "pass_percentage");

  if (error) {
    return { error: error.message };
  }

  if (existing) {
    await logAudit({
      actorId: profile.user_id,
      action: "pass_percentage_updated",
      entityType: "school_settings",
      entityId: existing.id,
      oldData: { value: existing.value },
      newData: { value: String(value) }
    });
  }

  revalidatePath(SETTINGS_PATH);
  return { error: null };
}
