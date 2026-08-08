import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import InvoiceList from "@/components/InvoiceList";

export default async function WarehouseInvoicesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <InvoiceList dict={dict.warehouseInvoices} commonDict={dict.common} basePath="/warehouse/invoices" />;
}
