"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function updateStaffProfile(profileId: string, input: { fullName: string; phone: string; username: string; designation: string; joiningDate: string; isActive: boolean }) {
  await requireRole("clerk");
  const supabase = createClient();
  const { error } = await supabase.rpc("clerk_update_staff_profile", {
    p_profile_id: profileId,
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
    p_username: input.username.trim(),
    p_designation: input.designation.trim(),
    p_joining_date: input.joiningDate || null,
    p_is_active: input.isActive
  });
  if (error) return { error: error.code === "23505" ? "That username is already assigned." : error.message };
  revalidatePath("/clerk/staff");
  return { error: null };
}
