import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile } from "@/types/database";

import { OwnerMessagesClient } from "@/app/owner/messages/messages-client";

interface CoordinatorMessagesPageProps {
  searchParams?: { teacher?: string };
}

/**
 * Full messaging parity with owner - reuses OwnerMessagesClient directly
 * (a contact list of every teacher plus a broadcast-to-all action), not the
 * earlier single-fixed-thread-with-owner pattern. can_manage_academics() in
 * the messages_insert RLS policy grants academic_coordinator the same reach
 * into every teacher that owner has; sendBroadcastToTeachers/
 * sendMessageToTeacher/markThreadReadForTeacher in app/owner/messages/
 * actions.ts are all guarded for owner-or-academic_coordinator.
 */
export default async function CoordinatorMessagesPage({
  searchParams
}: CoordinatorMessagesPageProps) {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();

  const [{ data: teachersData }, { data: messagesData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "teacher").order("full_name", { ascending: true }),
    supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${profile.user_id},recipient_id.eq.${profile.user_id}`)
      .order("created_at", { ascending: true })
  ]);

  const teachers = (teachersData as Profile[] | null) ?? [];
  const messages = (messagesData as Message[] | null) ?? [];
  const selectedTeacherId = teachers.some((teacher) => teacher.user_id === searchParams?.teacher)
    ? (searchParams?.teacher as string)
    : null;

  return (
    <OwnerMessagesClient
      ownerUserId={profile.user_id}
      teachers={teachers}
      messages={messages}
      selectedTeacherId={selectedTeacherId}
      basePath="/coordinator/messages"
    />
  );
}
