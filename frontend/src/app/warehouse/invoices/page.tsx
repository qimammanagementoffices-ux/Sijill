import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import InvoiceList from "./InvoiceList";

export default async function WarehouseInvoicesPage() {
  const dict = await getDictionary(defaultLocale);
  return <InvoiceList dict={dict.warehouseInvoices} />;
}
