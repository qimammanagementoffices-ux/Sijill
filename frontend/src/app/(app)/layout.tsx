import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import { getAvailableLocales } from "@/i18n/locales";
import { getBranding } from "@/lib/getBranding";
import AppShell from "@/components/AppShell";

// Wraps every authenticated route (dashboard, employees, warehouse,
// maintenance, assets, admin/*, ...) in the persistent sidebar/topbar shell.
// A route group (parens in the folder name) so none of these URLs change --
// /employees is still /employees, just rendered inside this shared layout
// instead of as a standalone page with no navigation chrome.
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  const [dict, locales, branding] = await Promise.all([
    getDictionary(locale),
    getAvailableLocales(),
    getBranding(),
  ]);
  return (
    <AppShell
      dict={dict.dashboard}
      employeesDict={dict.employees}
      errorsDict={dict.errors}
      commonDict={dict.common}
      locales={locales}
      currentLocale={locale}
      branding={branding}
    >
      {children}
    </AppShell>
  );
}
