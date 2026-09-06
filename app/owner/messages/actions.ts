"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";

type ActionResult = { error: string | null };

const MESSAGES_PATH = "/owner/messages";
const COORDINATOR_MESSAGES_PATH = "/coordinator/messages";

/**
 * Sends a message to a teacher (owner and academic_coordinator both have
 * full messaging parity with every teacher - can_manage_academics() in the
 * messages_insert RLS policy grants coordinator this same reach). Also used
 * for messaging the owner (recipientUserId = owner's id) by any non-owner
 * role, since messages_insert separately allows that direction for everyone.
 */
export async function sendMessageToTeacher(
  recipientUserId: string,
  body: string
): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const t = await getT();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: t("owner.messages.emptyMessage") };
  }
  if (!recipientUserId) {
    return { error: t("owner.messages.noTeacherSelected") };
  }

  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: profile.user_id,
    recipient_id: recipientUserId,
    body: trimmedBody
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(MESSAGES_PATH);
  revalidatePath(COORDINATOR_MESSAGES_PATH);
  return { error: null };
}

/**
 * Fans a single compose action out into one message row per active
 * teacher, all sharing one freshly-generated broadcast_id so every
 * recipient's copy can be traced back to the same broadcast action.
 * Owner and academic_coordinator both get this - full messaging parity.
 */
export async function sendBroadcastToTeachers(body: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const t = await getT();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: t("owner.messages.emptyMessage") };
  }

  const supabase = createClient();
  const { data: teachers, error: teachersError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("role", "teacher")
    .eq("is_active", true);

  if (teachersError) {
    return { error: teachersError.message };
  }
  if (!teachers || teachers.length === 0) {
    return { error: t("owner.messages.noTeachersToMessage") };
  }

  const broadcastId = crypto.randomUUID();
  const rows = (teachers as { user_id: string }[]).map((teacher) => ({
    sender_id: profile.user_id,
    recipient_id: teacher.user_id,
    body: trimmedBody,
    broadcast_id: broadcastId
  }));

  const { error } = await supabase.from("messages").insert(rows);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(MESSAGES_PATH);
  revalidatePath(COORDINATOR_MESSAGES_PATH);
  return { error: null };
}

/**
 * Marks every unread message from the given counterpart (to the current
 * user) as read. Called when the owner or coordinator opens a teacher's
 * thread.
 */
export async function markThreadReadForTeacher(teacherUserId: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);

  if (!teacherUserId) {
    return { error: null };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.user_id)
    .eq("sender_id", teacherUserId)
    .is("read_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(MESSAGES_PATH);
  revalidatePath(COORDINATOR_MESSAGES_PATH);
  return { error: null };
}
