import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import SiteMaintenanceAdmin from "./SiteMaintenanceAdmin";

export default async function SiteMaintenanceAdminPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return <SiteMaintenanceAdmin dict={dict.siteMaintenanceAdmin} locale={locale} />;
}
