import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile } from "@/types/database";

import { OwnerMessagesClient } from "./messages-client";

interface OwnerMessagesPageProps {
  searchParams?: { teacher?: string };
}

export default async function OwnerMessagesPage({ searchParams }: OwnerMessagesPageProps) {
  const profile = await requireRole("owner");
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
    />
  );
}
