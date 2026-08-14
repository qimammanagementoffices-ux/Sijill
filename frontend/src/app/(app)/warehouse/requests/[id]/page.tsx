import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import RequestDetailView from "./RequestDetailView";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <RequestDetailView
      id={params.id}
      dict={dict.warehouseRequests}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      statusDict={dict.requestStatus}
    />
  );
}
