import type en from "@/lib/i18n/dictionaries/en";

export type Locale = "en" | "ur";
export const LOCALES: Locale[] = ["en", "ur"];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * The canonical shape every dictionary must implement, derived from
 * English but with every leaf widened to `string` - a translation
 * dictionary must match the English *key structure* exactly, not repeat
 * its literal string values.
 */
export type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof en>;

/**
 * Deliberately plain `string`, not a compile-time union of every dot-path in
 * the dictionary. The dictionary is composed from many independently-owned
 * per-domain files (lib/i18n/dictionaries/en/<domain>.ts +
 * ur/<domain>.ts) that get merged in index.ts - keeping this a strict
 * literal-key union would mean every one of those files has to be merged
 * before ANY of them typechecks, which defeats working on them in
 * parallel. translate() already falls back to the raw key string at
 * runtime when a key is missing, so an unmapped key is visibly wrong
 * (shows up as "domain.key" in the UI) rather than silently blank -
 * that's the safety net here instead of a compile-time guarantee.
 */
export type TranslationKey = string;

export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
