import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import RequestList from "./RequestList";

export default async function WarehouseRequestsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <RequestList dict={dict.warehouseRequests} errorsDict={dict.errors} commonDict={dict.common} />;
}
