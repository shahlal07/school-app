import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile } from "@/types/database";

import { PrincipalMessagesClient } from "./messages-client";

/**
 * Principal messaging page - modeled on app/teacher/messages/page.tsx's
 * message-the-owner pattern rather than app/owner/messages/page.tsx's
 * broadcast-to-teachers pattern. See ./actions.ts for why: the messages
 * table's RLS only lets a non-owner sender message the owner.
 */
export default async function PrincipalMessagesPage() {
  const profile = await requireAnyRole(["owner", "principal"]);
  const supabase = createClient();

  const { data: ownerData } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "owner")
    .single();

  const ownerProfile = (ownerData as Profile | null) ?? null;
  // If an owner is previewing this page, there is no meaningful "owner" to
  // message (it would be themselves) - treat that as no owner found.
  const owner = ownerProfile && ownerProfile.user_id !== profile.user_id ? ownerProfile : null;

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
    <PrincipalMessagesClient
      principalUserId={profile.user_id}
      owner={owner}
      messages={messages}
    />
  );
}
