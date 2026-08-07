import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import RequestDetailView from "./RequestDetailView";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <RequestDetailView id={params.id} dict={dict.warehouseRequests} />;
}
