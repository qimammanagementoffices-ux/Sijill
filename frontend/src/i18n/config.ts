// Single source of truth for supported locales.
//
// The third language is intentionally NOT added yet — architecture review item #2
// requires selecting a genuinely reviewed translation before coding against it,
// and explicitly warns against mislabeling Hindi/Devanagari as Urdu. Add it here
// (and to every dictionary file below) only once that's decided and translated.

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};
