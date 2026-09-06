"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/types";

/**
 * Persists the language choice: cookie always (works for logged-out pages
 * like /login too), plus profiles.locale via the set_my_locale() RPC when
 * signed in (so the choice follows the user across devices/sessions). The
 * client calls router.refresh() right after this resolves, so every server
 * component re-renders in the new language immediately - no reload, no
 * re-login, per the "instant switching" requirement.
 */
export async function setLocaleAction(locale: Locale): Promise<{ error: string | null }> {
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.rpc("set_my_locale", { p_locale: locale });
    if (error) return { error: error.message };
  }

  return { error: null };
}
