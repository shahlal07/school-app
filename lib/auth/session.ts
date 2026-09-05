import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (profile as Profile | null) ?? null;
}

/**
 * Server-side route guard. Redirects to /login if there is no active
 * session, or to the correct role's home if the signed-in profile has a
 * different role than required. This is a UX convenience only - the real
 * security boundary is Postgres RLS, which enforces the same scoping even
 * if this guard were bypassed.
 */
export async function requireRole(role: "owner" | "teacher"): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  if (profile.role !== role) {
    redirect(profile.role === "owner" ? "/owner" : "/teacher");
  }

  return profile;
}
