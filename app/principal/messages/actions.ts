"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";

type ActionResult = { error: string | null };

const MESSAGES_PATH = "/principal/messages";

/**
 * Sends a message from the signed-in principal to the owner.
 *
 * This deliberately mirrors app/teacher/messages/actions.ts's
 * sendMessageToOwner (message-the-owner), NOT app/owner/messages/actions.ts
 * (broadcast-to-teachers). The messages_insert RLS policy
 * (supabase/migrations/20260906113136_optimize_rls_and_harden_updates.sql)
 * only allows a non-owner sender to insert when the recipient is the owner:
 *   (sender_id = auth.uid()) and (is_owner() or recipient is owner)
 * A principal is not is_owner(), so a principal-to-teacher message (the
 * owner's broadcast/reply pattern) would be rejected by this policy. Owner
 * previewing this page is unaffected since is_owner() bypasses the
 * recipient check for them.
 */
export async function sendMessageToOwner(
  ownerUserId: string,
  body: string
): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "principal"]);
  const t = await getT();

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: t("principal.messages.emptyBody") };
  }
  if (!ownerUserId) {
    return { error: t("principal.messages.ownerNotFound") };
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
 * Marks every unread message from the owner (to this principal) as read.
 */
export async function markOwnerMessagesRead(): Promise<ActionResult> {
  const profile = await requireAnyRole(["owner", "principal"]);

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
