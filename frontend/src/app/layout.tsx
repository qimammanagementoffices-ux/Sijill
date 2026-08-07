import type { Metadata } from "next";
import { defaultLocale, localeDirection } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Sijill",
};

// Every page depends on a live backend call now — getDictionary() fetches
// translations from the API instead of static JSON (see i18n/getDictionary.ts),
// and most pages also fetch live data. Force dynamic rendering app-wide so
// `next build` doesn't try to prerender any page against an unreachable
// backend (this cascades to every route below this layout).
export const dynamic = "force-dynamic";

// Locale is fixed to the default for now — a locale switcher/route segment
// is a Phase 6 i18n item, not Phase 1. Direction must still be correct
// from day one since every layout decision downstream assumes it.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dir = localeDirection[defaultLocale];
  return (
    <html lang={defaultLocale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
