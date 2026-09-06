import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile } from "@/types/database";

import { TeacherMessagesClient } from "./messages-client";

export default async function TeacherMessagesPage() {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const { data: ownerData } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "owner")
    .single();

  const owner = (ownerData as Profile | null) ?? null;

  const messages: Message[] = [];
  if (owner) {
    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${profile.user_id},recipient_id.eq.${owner.user_id}),and(sender_id.eq.${owner.user_id},recipient_id.eq.${profile.user_id})`
      )
      .order("created_at", { ascending: true });
    messages.push(...((messagesData as Message[] | null) ?? []));
  }

  return (
    <TeacherMessagesClient
      teacherUserId={profile.user_id}
      owner={owner}
      messages={messages}
    />
  );
}
