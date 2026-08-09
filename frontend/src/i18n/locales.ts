import "server-only";

// Backed by GET /i18n/locales -- ar/en/hi plus any admin-added languages
// (Phase 9's /admin/languages). Public endpoint, no auth: every visitor
// needs this to render the language switcher, not just admins.
export type LocaleInfo = { code: string; name: string; direction: "ltr" | "rtl" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export async function getAvailableLocales(): Promise<LocaleInfo[]> {
  // See getBranding.ts's comment -- a 200-with-HTML cold-start response used
  // to reach res.json() and throw, crashing every page using this.
  try {
    const res = await fetch(`${API_URL}/i18n/locales`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
