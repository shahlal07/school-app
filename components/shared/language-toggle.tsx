"use client";

import { useTranslation } from "@/lib/i18n/locale-provider";

/**
 * App-wide English/Urdu toggle. Lives in the authenticated shell header so
 * it's reachable from every dashboard, not buried in settings. Switching
 * calls setLocale() (persists to cookie + profiles.locale, then
 * router.refresh()) - the whole app re-renders in the new language
 * immediately, no reload/re-login required.
 */
export function LanguageToggle() {
  const { locale, setLocale, changing } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Change application language"
      className="inline-flex items-center overflow-hidden rounded-full border border-neutral-200 text-xs font-medium"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={changing}
        aria-pressed={locale === "en"}
        aria-label="Switch to English"
        className={`px-2.5 py-1.5 transition-colors disabled:opacity-60 ${
          locale === "en" ? "bg-primary-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("ur")}
        disabled={changing}
        aria-pressed={locale === "ur"}
        aria-label="اردو میں تبدیل کریں"
        lang="ur"
        dir="rtl"
        className={`px-2.5 py-1.5 font-urdu text-sm transition-colors disabled:opacity-60 ${
          locale === "ur" ? "bg-primary-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        اردو
      </button>
    </div>
  );
}
