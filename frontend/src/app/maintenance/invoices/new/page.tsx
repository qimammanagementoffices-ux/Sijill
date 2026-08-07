import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewInvoiceView from "@/components/NewInvoiceView";

export default async function NewMaintenanceInvoicePage() {
  const dict = await getDictionary(defaultLocale);
  return (
    <NewInvoiceView
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      basePath="/maintenance/invoices"
      itemsPath="/maintenance/parts"
    />
  );
}
