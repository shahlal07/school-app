import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";
import type { TranslationKey } from "@/lib/i18n/types";

/**
 * Server-side equivalent of useTranslation()'s t() - for layouts/pages
 * (server components) that build strings (nav labels, page titles) before
 * handing them to a client shell component as plain props.
 */
export async function getT(): Promise<(key: TranslationKey) => string> {
  const locale = await getLocale();
  return (key: TranslationKey) => translate(locale, key);
}
