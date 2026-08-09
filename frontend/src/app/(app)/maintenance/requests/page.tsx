import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import MaintenanceRequestList from "./MaintenanceRequestList";

export default async function MaintenanceRequestsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <MaintenanceRequestList dict={dict.maintenanceRequests} errorsDict={dict.errors} commonDict={dict.common} />;
}
