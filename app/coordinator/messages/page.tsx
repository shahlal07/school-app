import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import type { Message, Profile } from "@/types/database";

import { CoordinatorMessagesClient } from "./messages-client";

/**
 * Coordinator's messages page. Not a reuse of OwnerMessagesClient - that
 * component is shaped for "owner talking to many teachers" (a contact list
 * plus a broadcast-to-all-teachers action), which doesn't fit a coordinator,
 * who per the messages RLS insert policy (0009_messages.sql) may only
 * message the owner, not other staff ("A teacher may only message the
 * owner, never another teacher"; this applies to any non-owner sender,
 * academic_coordinator included). So this is a single fixed thread with the
 * owner rather than a conversation list. It reuses the same underlying
 * <ChatThread/> bubble UI and the same sendMessageToTeacher/
 * markThreadReadForTeacher actions (widened from owner-only to
 * owner-or-academic_coordinator in app/owner/messages/actions.ts) - just not
 * sendBroadcastToTeachers, which stays an owner-only power.
 */
export default async function CoordinatorMessagesPage() {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();

  const { data: ownerData } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const owner = ownerData as Profile | null;

  if (!owner) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900">Messages</h1>
        <EmptyState
          title="No owner account found"
          description="There is no active owner to message yet."
        />
      </div>
    );
  }

  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${profile.user_id},recipient_id.eq.${profile.user_id}`)
    .order("created_at", { ascending: true });

  const allMessages = (messagesData as Message[] | null) ?? [];
  const threadMessages = allMessages.filter(
    (message) =>
      (message.sender_id === profile.user_id && message.recipient_id === owner.user_id) ||
      (message.sender_id === owner.user_id && message.recipient_id === profile.user_id)
  );

  return (
    <CoordinatorMessagesClient
      currentUserId={profile.user_id}
      owner={owner}
      messages={threadMessages}
    />
  );
}
