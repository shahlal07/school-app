import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/types";

export const LOCALE_COOKIE = "od_locale";

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as string[]).includes(value);
}

/**
 * Resolves the request's locale server-side, before first paint, so
 * <html lang dir> and the Urdu font are correct from the very first byte -
 * no flash of the wrong language/direction. Persistence order per the
 * product spec: signed-in profile preference first, then the cookie
 * (covers the login page and the instant it takes for a fresh sign-in to
 * load its profile), then the default.
 */
export async function getLocale(): Promise<Locale> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale")
      .eq("user_id", user.id)
      .maybeSingle();
    if (isLocale(profile?.locale as string | undefined)) {
      return profile!.locale as Locale;
    }
  }

  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return DEFAULT_LOCALE;
}
