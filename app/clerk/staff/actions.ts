"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STAFF_PATH = "/clerk/staff";

/**
 * The only way to write designation/joining_date - profiles' row-level RLS
 * stays owner-only, so a direct `.from("profiles").update(...)` would be
 * rejected. This RPC internally checks can_manage_student_records() (true
 * for owner/principal/clerk) and raises insufficient_privilege otherwise.
 */
export async function updateStaffRecordFields(
  userId: string,
  designation: string | null,
  joiningDate: string | null
): Promise<{ error: string | null }> {
  await requireAnyRole(["owner", "principal", "clerk"]);
  const supabase = createClient();

  const { error } = await supabase.rpc("set_staff_record_fields", {
    p_user_id: userId,
    p_designation: designation,
    p_joining_date: joiningDate
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(STAFF_PATH);
  return { error: null };
}
