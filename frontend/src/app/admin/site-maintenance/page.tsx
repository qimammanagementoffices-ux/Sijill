import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import SiteMaintenanceAdmin from "./SiteMaintenanceAdmin";

export default async function SiteMaintenanceAdminPage() {
  const dict = await getDictionary(defaultLocale);
  return <SiteMaintenanceAdmin dict={dict.siteMaintenanceAdmin} />;
}
