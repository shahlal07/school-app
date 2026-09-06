"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { usernameToSyntheticEmail } from "@/lib/auth/username";

/**
 * Accepts either a real email (owner accounts) or a username (most teacher
 * accounts, which have no real email) - resolved to the same deterministic
 * synthetic email used at account-creation time, so no lookup is needed.
 */
export async function signIn(
  identifier: string,
  password: string
): Promise<{ error: string | null }> {
  const trimmedIdentifier = identifier.trim();
  const email = trimmedIdentifier.includes("@")
    ? trimmedIdentifier
    : usernameToSyntheticEmail(trimmedIdentifier);

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to sign in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is not active. Contact the school owner." };
  }

  redirect(profile.role === "owner" ? "/owner" : "/teacher");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
