import en from "@/lib/i18n/dictionaries/en";
import ur from "@/lib/i18n/dictionaries/ur";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

export const DICTIONARIES = { en, ur } as const;

export function getByPath(obj: unknown, path: string): string | undefined {
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

/** Falls back to English, then to the raw key, so a missing translation is visible/debuggable rather than blank. */
export function translate(locale: Locale, key: TranslationKey): string {
  return getByPath(DICTIONARIES[locale], key) ?? getByPath(DICTIONARIES.en, key) ?? key;
}
