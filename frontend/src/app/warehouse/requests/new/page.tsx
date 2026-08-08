import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewRequestView from "./NewRequestView";

export default async function NewRequestPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <NewRequestView dict={dict.warehouseRequests} errorsDict={dict.errors} />;
}
