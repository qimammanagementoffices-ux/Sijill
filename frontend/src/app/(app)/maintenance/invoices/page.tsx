import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import InvoiceList from "@/components/InvoiceList";

export default async function MaintenanceInvoicesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <InvoiceList
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      commonDict={dict.common}
      basePath="/maintenance/invoices"
      itemsPath="/maintenance/parts"
    />
  );
}
