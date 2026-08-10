"use client";

import { useEffect, useState } from "react";

// Entity names (categories, departments, fault types...) are stored as three
// columns rather than translation keys, so dropdowns have to pick one. The
// locale lives on <html lang> (set by RootLayout from the cookie), which is
// the only place a client component can read it without threading a prop
// through every page -> directory -> modal -> form chain.
//
// Reads after mount, so the first paint is Arabic and then settles. Fine for
// a dropdown label; do not reuse this where a wrong first frame matters.
export function useEntityLocale(): "ar" | "en" | "hi" {
  const [locale, setLocale] = useState<"ar" | "en" | "hi">("ar");
  useEffect(() => {
    const lang = document.documentElement.lang;
    if (lang === "en" || lang === "hi") setLocale(lang);
  }, []);
  return locale;
}

// Falls back to Arabic: it is the required field on every entity, so it is
// the one name guaranteed to be there.
export function entityName(
  entity: { nameAr: string; nameEn?: string | null; nameHi?: string | null },
  locale: "ar" | "en" | "hi"
): string {
  if (locale === "en") return entity.nameEn || entity.nameAr;
  if (locale === "hi") return entity.nameHi || entity.nameAr;
  return entity.nameAr;
}
