"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };
const STAFF_ROLES = ["owner", "principal", "academic_coordinator", "clerk", "teacher"] as const;

export async function sendMessage(recipientUserId: string, body: string): Promise<ActionResult> {
  const profile = await requireAnyRole([...STAFF_ROLES]);
  const trimmedBody = body.trim();
  if (!recipientUserId) return { error: "Select a recipient first." };
  if (!trimmedBody) return { error: "Message cannot be empty." };
  if (recipientUserId === profile.user_id) return { error: "You cannot message yourself." };

  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: profile.user_id,
    recipient_id: recipientUserId,
    body: trimmedBody
  });

  if (error) return { error: error.message };
  revalidateMessagingPaths();
  return { error: null };
}

export async function broadcastOwnerMessage(body: string): Promise<ActionResult & { sent: number }> {
  const profile = await requireAnyRole(["owner"]);
  const trimmedBody = body.trim();
  if (!trimmedBody) return { error: "Message cannot be empty.", sent: 0 };

  const supabase = createClient();
  const { data: recipients, error: peopleError } = await supabase
    .rpc("list_messageable_profiles");

  if (peopleError) return { error: peopleError.message, sent: 0 };

  const activeRecipients = ((recipients ?? []) as { user_id: string; is_active: boolean }[])
    .filter((person) => person.is_active && person.user_id !== profile.user_id);

  if (activeRecipients.length === 0) return { error: "No active staff recipients found.", sent: 0 };

  const rows = activeRecipients.map((person) => ({
    sender_id: profile.user_id,
    recipient_id: person.user_id,
    body: trimmedBody
  }));

  const { error } = await supabase.from("messages").insert(rows);
  if (error) return { error: error.message, sent: 0 };

  revalidateMessagingPaths();
  return { error: null, sent: rows.length };
}

export async function markMessagesRead(counterpartUserId: string): Promise<ActionResult> {
  const profile = await requireAnyRole([...STAFF_ROLES]);
  if (!counterpartUserId) return { error: null };

  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.user_id)
    .eq("sender_id", counterpartUserId)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidateMessagingPaths();
  return { error: null };
}

function revalidateMessagingPaths() {
  revalidatePath("/owner/messages");
  revalidatePath("/principal/messages");
  revalidatePath("/coordinator/messages");
  revalidatePath("/clerk/messages");
  revalidatePath("/teacher/messages");
}
