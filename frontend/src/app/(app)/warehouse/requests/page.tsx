import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import RequestList from "./RequestList";

export default async function WarehouseRequestsPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <RequestList
      dict={dict.warehouseRequests}
      errorsDict={dict.errors}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      statusDict={dict.requestStatus}
      actionsDict={dict.requestActions}
      modalsDict={dict.requestModals}
      cardDict={dict.requestCard}
      deliveryDict={dict.requestDelivery}
      locale={locale}
    />
  );
}
