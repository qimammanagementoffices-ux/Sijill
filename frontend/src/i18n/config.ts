// Built-in locales and the site-wide default/fallback. Admin-added
// languages (Phase 9, /admin/languages) aren't listed here -- they're
// fetched live from GET /i18n/locales (see i18n/locales.ts) since they're
// dynamic, not a fixed set known at build time.
//
// Hindi (Devanagari, LTR) is the confirmed third language — not Urdu, per
// architecture review item #2's explicit warning against mislabeling
// Hindi/Devanagari as Urdu. Translations are DB-backed now (see
// getDictionary.ts); this just declares the built-in locales and their
// direction. The live switcher (getRequestLocale.ts, LocaleSwitcher.tsx)
// lets a visitor pick any locale GET /i18n/locales returns, built-in or not.

export const locales = ["ar", "en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
  hi: "ltr",
};
