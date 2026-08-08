import type { Metadata } from "next";
import { defaultLocale, localeDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import MaintenanceGate from "@/components/MaintenanceGate";
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

// Locale is fixed to the default for now — a locale switcher/route segment
// is a Phase 6 i18n item, not Phase 1. Direction must still be correct
// from day one since every layout decision downstream assumes it.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dir = localeDirection[defaultLocale];
  const [branding, maintenance, dict] = await Promise.all([
    getBranding(),
    getMaintenanceStatus(),
    getDictionary(defaultLocale),
  ]);
  return (
    <html lang={defaultLocale} dir={dir} style={{ ["--brand-primary" as string]: branding.primaryColor }}>
      <body>
        <MaintenanceGate status={maintenance} dict={dict.siteMaintenancePage}>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
