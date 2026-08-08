import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewInvoiceView from "@/components/NewInvoiceView";

export default async function NewInvoicePage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <NewInvoiceView
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      basePath="/warehouse/invoices"
      itemsPath="/warehouse/items"
    />
  );
}
