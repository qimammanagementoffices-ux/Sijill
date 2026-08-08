import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewInvoiceView from "@/components/NewInvoiceView";

export default async function NewMaintenanceInvoicePage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <NewInvoiceView
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      basePath="/maintenance/invoices"
      itemsPath="/maintenance/parts"
    />
  );
}
