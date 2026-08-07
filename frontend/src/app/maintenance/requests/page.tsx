import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import MaintenanceRequestList from "./MaintenanceRequestList";

export default async function MaintenanceRequestsPage() {
  const dict = await getDictionary(defaultLocale);
  return <MaintenanceRequestList dict={dict.maintenanceRequests} commonDict={dict.common} />;
}
