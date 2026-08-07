import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewRequestView from "./NewRequestView";

export default async function NewRequestPage() {
  const dict = await getDictionary(defaultLocale);
  return <NewRequestView dict={dict.warehouseRequests} errorsDict={dict.errors} />;
}
