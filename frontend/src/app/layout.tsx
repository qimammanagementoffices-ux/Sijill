import type { Metadata } from "next";
import { defaultLocale, localeDirection } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Sijill",
};

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
