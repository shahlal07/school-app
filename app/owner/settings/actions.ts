"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

const SETTINGS_PATH = "/owner/settings";

export async function updatePassPercentage(value: number): Promise<ActionResult> {
  await requireRole("owner");

  if (!Number.isFinite(value) || value < 1 || value > 100) {
    return { error: "Pass percentage must be a number between 1 and 100." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("school_settings")
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq("key", "pass_percentage");

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SETTINGS_PATH);
  return { error: null };
}
