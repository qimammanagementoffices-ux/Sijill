import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import InvoiceList from "@/components/InvoiceList";

export default async function WarehouseInvoicesPage() {
  const dict = await getDictionary(defaultLocale);
  return <InvoiceList dict={dict.warehouseInvoices} commonDict={dict.common} basePath="/warehouse/invoices" />;
}
