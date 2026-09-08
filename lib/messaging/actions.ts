"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function sendMessage(recipientUserId: string, body: string): Promise<ActionResult> {
  const profile = await requireAnyRole([
    "owner",
    "principal",
    "academic_coordinator",
    "clerk",
    "teacher"
  ]);

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

  revalidatePath("/owner/messages");
  revalidatePath("/principal/messages");
  revalidatePath("/coordinator/messages");
  revalidatePath("/clerk/messages");
  revalidatePath("/teacher/messages");
  return { error: null };
}

export async function markMessagesRead(counterpartUserId: string): Promise<ActionResult> {
  const profile = await requireAnyRole([
    "owner",
    "principal",
    "academic_coordinator",
    "clerk",
    "teacher"
  ]);

  if (!counterpartUserId) return { error: null };

  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.user_id)
    .eq("sender_id", counterpartUserId)
    .is("read_at", null);

  if (error) return { error: error.message };

  revalidatePath("/owner/messages");
  revalidatePath("/principal/messages");
  revalidatePath("/coordinator/messages");
  revalidatePath("/clerk/messages");
  revalidatePath("/teacher/messages");
  return { error: null };
}
