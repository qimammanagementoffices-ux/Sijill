import type { Metadata } from "next";
import { defaultLocale, localeDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import { getAvailableLocales } from "@/i18n/locales";
import MaintenanceGate from "@/components/MaintenanceGate";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import type { MaintenanceDto } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sijill",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type BrandingDto = { preset: string; primaryColor: string; logoUrl: string | null; version: number };

async function getBranding(): Promise<BrandingDto> {
  const res = await fetch(`${API_URL}/branding`, { next: { revalidate: 60 } });
  if (!res.ok) return { preset: "default", primaryColor: "#0f766e", logoUrl: null, version: 0 };
  return res.json();
}

// Deliberately NOT cached (no next.revalidate) — maintenance mode needs to
// take effect immediately when an admin flips it, not up to a minute later.
async function getMaintenanceStatus(): Promise<MaintenanceDto> {
  const res = await fetch(`${API_URL}/maintenance`, { cache: "no-store" });
  if (!res.ok) return { enabled: false, messageAr: null, messageEn: null, messageHi: null, imageAttachmentId: null, imageUrl: null, reopenAt: null, version: 0 };
  return res.json();
}

// Every page depends on a live backend call now — getDictionary() fetches
// translations from the API instead of static JSON (see i18n/getDictionary.ts),
// and most pages also fetch live data. Force dynamic rendering app-wide so
// `next build` doesn't try to prerender any page against an unreachable
// backend (this cascades to every route below this layout).
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [branding, maintenance, locale, availableLocales] = await Promise.all([
    getBranding(),
    getMaintenanceStatus(),
    getRequestLocale(),
    getAvailableLocales(),
  ]);
  const dict = await getDictionary(locale);
  const dir = availableLocales.find((l) => l.code === locale)?.direction ?? localeDirection[defaultLocale];
  return (
    <html lang={locale} dir={dir} style={{ ["--brand-primary" as string]: branding.primaryColor }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+Devanagari:wght@400;500;700&family=Inter:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* lang-{locale} drives globals.css's per-language font selection
          (Cairo for ar and any unlisted locale, Inter for en, Noto Sans
          Devanagari for hi) -- see the CSS file's comment on why "hi" not
          "ur" is used, matching this project's own Hindi-not-Urdu rule. */}
      <body className={`lang-${locale}`}>
        <MaintenanceGate status={maintenance} dict={dict.siteMaintenancePage}>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
