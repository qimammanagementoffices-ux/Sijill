import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import MaintenanceRequestDetailView from "./MaintenanceRequestDetailView";

export default async function MaintenanceRequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <MaintenanceRequestDetailView id={params.id} dict={dict.maintenanceRequests} />;
}
