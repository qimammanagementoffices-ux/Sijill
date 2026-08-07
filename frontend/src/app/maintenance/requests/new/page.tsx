import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewMaintenanceRequestView from "./NewMaintenanceRequestView";

export default async function NewMaintenanceRequestPage() {
  const dict = await getDictionary(defaultLocale);
  return <NewMaintenanceRequestView dict={dict.maintenanceRequests} errorsDict={dict.errors} />;
}
