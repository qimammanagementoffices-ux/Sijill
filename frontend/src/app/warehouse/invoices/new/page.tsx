import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewInvoiceView from "./NewInvoiceView";

export default async function NewInvoicePage() {
  const dict = await getDictionary(defaultLocale);
  return <NewInvoiceView dict={dict.warehouseInvoices} errorsDict={dict.errors} />;
}
