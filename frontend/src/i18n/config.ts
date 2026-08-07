// Single source of truth for supported locales.
//
// Hindi (Devanagari, LTR) is the confirmed third language — not Urdu, per
// architecture review item #2's explicit warning against mislabeling
// Hindi/Devanagari as Urdu. Translations are DB-backed now (see
// getDictionary.ts); this just declares which locales exist and their
// direction. No live language switcher yet — the site still renders
// Arabic by default, a switcher is a later phase.

export const locales = ["ar", "en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
  hi: "ltr",
};
