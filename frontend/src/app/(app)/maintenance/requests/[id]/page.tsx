import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import MaintenanceRequestDetailView from "./MaintenanceRequestDetailView";

export default async function MaintenanceRequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <MaintenanceRequestDetailView
      id={params.id}
      dict={dict.maintenanceRequests}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      statusDict={dict.requestStatus}
    />
  );
}
