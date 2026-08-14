import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetRequestList from "./AssetRequestList";

export default async function AssetRequestsPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <AssetRequestList
      dict={dict.assetRequests}
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
