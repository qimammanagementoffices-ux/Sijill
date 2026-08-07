import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import RequestList from "./RequestList";

export default async function WarehouseRequestsPage() {
  const dict = await getDictionary(defaultLocale);
  return <RequestList dict={dict.warehouseRequests} />;
}
