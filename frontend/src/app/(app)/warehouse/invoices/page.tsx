import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import InvoiceList from "@/components/InvoiceList";

export default async function WarehouseInvoicesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <InvoiceList
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      attachmentOwnerType="WAREHOUSE_INVOICE"
      basePath="/warehouse/invoices"
      itemsPath="/warehouse/items"
      itemSearchPlaceholder={dict.warehouseItems.searchPlaceholder}
      itemSearchEmptyLabel={dict.warehouseItems.noResults}
    />
  );
}
