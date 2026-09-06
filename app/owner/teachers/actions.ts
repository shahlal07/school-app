"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function inviteTeacher(
  fullName: string,
  email: string
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName) {
    return { error: "Full name is required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: "Enter a valid email address." };
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(trimmedEmail);

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to invite teacher." };
  }

  const supabase = createClient();
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: data.user.id,
    full_name: trimmedName,
    role: "teacher",
    is_active: true
  });

  if (profileError) {
    return { error: profileError.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: "teacher_invited",
    entityType: "profiles",
    entityId: data.user.id,
    newData: { full_name: trimmedName, email: trimmedEmail }
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}

export async function setTeacherActive(
  userId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("user_id", userId)
    .eq("role", "teacher");

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: isActive ? "teacher_reactivated" : "teacher_deactivated",
    entityType: "profiles",
    entityId: userId,
    newData: { is_active: isActive }
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}
