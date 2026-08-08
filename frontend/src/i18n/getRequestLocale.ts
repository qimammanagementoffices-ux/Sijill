import "server-only";
import { cookies } from "next/headers";
import { defaultLocale } from "./config";
import { getAvailableLocales } from "./locales";

// Set by LocaleSwitcher.tsx on the client, read here on every server-rendered
// page so the whole site (not just the layout shell) respects the visitor's
// chosen language -- auth uses localStorage (see MaintenanceGate's comment
// on why that can't be read server-side), but a plain preference cookie has
// no such restriction.
export const LOCALE_COOKIE = "sijill.locale";

// Re-validated against the live locale list on every call rather than
// trusting the cookie blindly -- a language can be deleted from
// /admin/languages after a visitor's cookie was set, and stale cookie value
// pointing at a locale with no rows would otherwise make getDictionary()
// return an empty map and the whole site render blank labels.
export async function getRequestLocale(): Promise<string> {
  const requested = cookies().get(LOCALE_COOKIE)?.value;
  if (!requested) return defaultLocale;
  const available = await getAvailableLocales();
  return available.some((l) => l.code === requested) ? requested : defaultLocale;
}
