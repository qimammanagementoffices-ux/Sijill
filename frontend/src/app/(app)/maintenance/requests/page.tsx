import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import MaintenanceRequestList from "./MaintenanceRequestList";

export default async function MaintenanceRequestsPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <MaintenanceRequestList
      dict={dict.maintenanceRequests}
      errorsDict={dict.errors}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      statusDict={dict.requestStatus}
      actionsDict={dict.requestActions}
      modalsDict={dict.requestModals}
      cardDict={dict.requestCard}
      requestErrorsDict={dict.requestErrors}
      locale={locale}
    />
  );
}
