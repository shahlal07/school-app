"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

const MESSAGES_PATH = "/teacher/messages";

/**
 * A teacher may only ever message the owner (enforced by RLS), so this
 * always sends to whichever profile has role "owner".
 */
export async function sendMessageToOwner(
  ownerUserId: string,
  body: string
): Promise<ActionResult> {
  const profile = await requireRole("teacher");

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "Message cannot be empty." };
  }
  if (!ownerUserId) {
    return { error: "Could not find the school owner to message." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: profile.user_id,
    recipient_id: ownerUserId,
    body: trimmedBody
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(MESSAGES_PATH);
  return { error: null };
}

/**
 * Marks every unread message from the owner (to this teacher) as read.
 * Called when the teacher opens their messages page.
 */
export async function markOwnerMessagesRead(): Promise<ActionResult> {
  const profile = await requireRole("teacher");

  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.user_id)
    .is("read_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(MESSAGES_PATH);
  return { error: null };
}
