import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import SiteMaintenanceAdmin from "./SiteMaintenanceAdmin";

export default async function SiteMaintenanceAdminPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <SiteMaintenanceAdmin dict={dict.siteMaintenanceAdmin} />;
}
