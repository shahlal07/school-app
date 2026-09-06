"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dir, type Locale, type TranslationKey } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n/translate";
import { setLocaleAction } from "@/lib/i18n/actions";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => Promise<void>;
  changing: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [changing, setChanging] = useState(false);

  const t = useCallback((key: TranslationKey): string => translate(locale, key), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      setChanging(true);
      setLocaleState(next); // instant UI feedback, before the round trip finishes
      await setLocaleAction(next);
      router.refresh();
      setChanging(false);
    },
    [locale, router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: dir(locale), t, setLocale, changing }),
    [locale, t, setLocale, changing]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }
  return ctx;
}
