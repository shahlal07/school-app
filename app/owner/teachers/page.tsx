import { createClient } from "@/lib/supabase/server";
import { TeachersClient } from "./teachers-client";
import type { Profile } from "@/types/database";

export default async function TeachersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  return <TeachersClient teachers={(data as Profile[] | null) ?? []} />;
}
