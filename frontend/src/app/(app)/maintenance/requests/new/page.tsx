import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewMaintenanceRequestView from "./NewMaintenanceRequestView";

export default async function NewMaintenanceRequestPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <NewMaintenanceRequestView dict={dict.maintenanceRequests} errorsDict={dict.errors} />;
}
