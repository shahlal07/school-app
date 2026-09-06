"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

const MESSAGES_PATH = "/owner/messages";
const COORDINATOR_MESSAGES_PATH = "/coordinator/messages";

/**
 * Sends a message. Despite the name (kept for owner-side callers, where
 * recipientUserId is a teacher), this is also used by the coordinator
 * segment to message the owner - the RLS insert policy on messages
 * (0009_messages.sql) already allows any non-owner sender as long as the
 * recipient's role is 'owner', so widening this guard beyond owner-only is
 * safe without any migration change.
 */
export async function sendMessageToTeacher(
  recipientUserId: string,
  body: string
): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "Message cannot be empty." };
  }
  if (!recipientUserId) {
    return { error: "No teacher selected." };
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
 */
export async function sendBroadcastToTeachers(body: string): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner"]);

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "Message cannot be empty." };
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
    return { error: "There are no teachers to message yet." };
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
  return { error: null };
}

/**
 * Marks every unread message from the given counterpart (to the current
 * user) as read. Called when the owner opens a teacher's thread, or when
 * the coordinator opens their thread with the owner.
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
