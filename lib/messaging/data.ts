import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile, StaffRole } from "@/types/database";

const ROLES: StaffRole[] = ["owner", "principal", "academic_coordinator", "clerk", "teacher"];

export async function getMessagingData() {
  const profile = await requireAnyRole(ROLES);
  const supabase = createClient();

  const [{ data: peopleData }, { data: messagesData }] = await Promise.all([
    supabase.rpc("list_messageable_profiles"),
    supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${profile.user_id},recipient_id.eq.${profile.user_id}`)
      .order("created_at", { ascending: true })
  ]);

  return {
    profile,
    people: (peopleData as Profile[] | null) ?? [],
    messages: (messagesData as Message[] | null) ?? []
  };
}
